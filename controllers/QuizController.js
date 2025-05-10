// controllers/quizController.js

import OpenAI from 'openai';
import QuizSession from '../models/QuizSession.js';
import dotenv from 'dotenv';

dotenv.config();

// Configurar OpenAI
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida');
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI configurado correctamente');
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

// Función para parsear preguntas desde texto plano
function parsePreguntas(texto) {
  const bloques = texto.split(/\n\s*\n/).filter(Boolean);
  const preguntas = [];

  bloques.forEach((bloque) => {
    const lineas = bloque.trim().split('\n');
    const preguntaLinea = lineas[0];
    const opciones = lineas.slice(1, 5);
    const respuestaLinea = lineas.find(l => l.toLowerCase().includes('respuesta'));

    if (!preguntaLinea || opciones.length < 4 || !respuestaLinea) return;

    const pregunta = preguntaLinea.replace(/^\d+\.\s*/, '').trim();
    const opcionesLimpias = opciones.map(op => {
      const partes = op.split(/[A-D]\.\s*/);
      return partes[1] ? partes[1].trim() : op.trim();
    });

    const letraCorrecta = respuestaLinea.match(/[A-D]/i)?.[0].toUpperCase();
    const indiceRespuesta = letraCorrecta ? letraCorrecta.charCodeAt(0) - 65 : -1;

    preguntas.push({
      question: pregunta,
      options: opcionesLimpias,
      answer: opcionesLimpias[indiceRespuesta] || ''
    });
  });

  return preguntas;
}

// Generar preguntas basadas en un tema seleccionado
export const generarPreguntasPorTema = async (req, res) => {
  try {
    const { tema } = req.body;

    if (!tema) {
      return res.status(400).json({ error: 'El tema es requerido' });
    }

    if (!openai) {
      return res.status(500).json({
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI'
      });
    }

    const prompt = `Genera exactamente 5 preguntas de opción múltiple sobre el tema "${tema}". 
Para cada pregunta:
1. Escribe la pregunta precedida por un número.
2. Lista 4 opciones usando A), B), C), D)
3. Indica la respuesta correcta al final usando "Respuesta: [letra]"

Ejemplo del formato:
1. ¿Cuál es la capital de Francia?
A) Madrid
B) Londres
C) París
D) Roma
Respuesta: C

Asegúrate de seguir exactamente este formato para cada pregunta.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un generador de preguntas de opción múltiple. Sigue exactamente el formato solicitado."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const textoGenerado = completion.choices[0].message.content;
    console.log('Texto generado por ChatGPT:', textoGenerado);

    const preguntas = parsePreguntas(textoGenerado);
    console.log('Preguntas parseadas:', JSON.stringify(preguntas, null, 2));

    if (preguntas.length === 0) {
      return res.status(500).json({
        error: 'No se pudieron generar preguntas válidas',
        rawText: textoGenerado
      });
    }

    // Guardar en base de datos
    const quizSession = new QuizSession({
      tema: tema,
      questions: JSON.stringify(preguntas),
      createdAt: new Date()
    });

    await quizSession.save();

    res.json({ questions: preguntas });
  } catch (error) {
    console.error('Error al generar las preguntas:', error);
    res.status(500).json({
      error: 'Error al procesar la solicitud',
      details: error.message
    });
  }
};

// Obtener historial de sesiones de quiz
export const obtenerHistorialDeSesion = async (req, res) => {
  try {
    const quizSessions = await QuizSession.find().sort({ createdAt: -1 }).limit(10);
    res.json(quizSessions);
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial de sesiones de quiz' });
  }
};
