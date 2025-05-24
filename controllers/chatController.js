import OpenAI from 'openai';
import Conversation from '../models/Conversation.js';
import QuizResult from '../models/QuizResult.js';
import dotenv from 'dotenv';

dotenv.config();

// Configurar OpenAI con manejo de errores mejorado
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida')
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI configurado correctamente');
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

// Generar respuesta de ChatGPT
export const generateChatResponse = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    if (!openai) {
      return res.status(500).json({ 
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI'
      });
    }    // Llamada a la API de OpenAI con modelo gpt-3.5-turbo para respuestas más avanzadas    // Validar que la pregunta esté relacionada con salud mental o bienestar estudiantil
    const mentalHealthKeywords = [
      'ansiedad', 'depresión', 'estrés', 'angustia', 'preocupación',
      'nervios', 'presión académica', 'estudios', 'exámenes', 'universidad',
      'carrera', 'clases', 'tareas', 'trabajos', 'calificaciones',
      'insomnio', 'cansancio', 'agotamiento', 'burnout', 'motivación'
    ];

    const hasRelevantKeywords = mentalHealthKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasRelevantKeywords) {
      return res.status(400).json({ 
        error: 'Lo siento, solo puedo ayudarte con temas relacionados con bienestar emocional, ansiedad, depresión y estrés académico.' 
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `Soy la Dra. Ana Martínez, psicóloga especializada en salud mental estudiantil con 15 años de experiencia. 
          Mi enfoque es brindar apoyo empático y profesional a estudiantes que enfrentan desafíos de salud mental, 
          especialmente relacionados con ansiedad, depresión y estrés académico.

          Directrices para mis respuestas:
          1. Mantener un tono cálido, empático y profesional
          2. Ofrecer sugerencias prácticas y realistas
          3. Enfatizar la importancia de buscar ayuda profesional cuando sea necesario
          4. Incluir técnicas de manejo del estrés y la ansiedad cuando sea apropiado
          5. Recordar que soy un complemento, no un reemplazo de la atención profesional
          6. Proporcionar recursos adicionales cuando sea relevante

          IMPORTANTE: Si detecto signos de crisis o riesgo, siempre recomendaré buscar ayuda profesional inmediata.` 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 500, // Aumentado para respuestas más completas
      temperature: 0.7,
    });    const response = completion.choices[0].message.content;

    // Categorizar la conversación
    const categories = {
      ansiedad: ['ansiedad', 'nervios', 'angustia', 'pánico', 'preocupación'],
      depresion: ['depresión', 'tristeza', 'soledad', 'desmotivación', 'apatía'],
      estres_academico: ['estrés', 'exámenes', 'universidad', 'tareas', 'presión']
    };

    let category = 'otro';
    const foundKeywords = [];
    let severity = 'no_especificado';
    let recommendedProfessionalHelp = false;

    // Detectar categoría y palabras clave
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => prompt.toLowerCase().includes(keyword.toLowerCase()))) {
        category = cat;
        foundKeywords.push(...keywords.filter(keyword => 
          prompt.toLowerCase().includes(keyword.toLowerCase())
        ));
      }
    }

    // Detectar severidad basada en palabras clave
    const severityKeywords = {
      grave: ['muy', 'mucho', 'grave', 'severo', 'intenso', 'siempre', 'suicid', 'crisis'],
      moderado: ['bastante', 'moderado', 'regular', 'frecuente', 'a menudo'],
      leve: ['poco', 'leve', 'ligero', 'ocasional', 'a veces']
    };

    for (const [sev, keywords] of Object.entries(severityKeywords)) {
      if (keywords.some(keyword => prompt.toLowerCase().includes(keyword.toLowerCase()))) {
        severity = sev;
        break;
      }
    }

    // Determinar si se debe recomendar ayuda profesional
    recommendedProfessionalHelp = severity === 'grave' || 
      response.toLowerCase().includes('profesional') ||
      response.toLowerCase().includes('especialista');

    // Guardar la conversación en la base de datos
    const conversation = new Conversation({
      prompt,
      response,
      category,
      keywords: foundKeywords,
      severity,
      recommendedProfessionalHelp
    });

    await conversation.save();

    res.json({ 
      response,
      recommendedProfessionalHelp,
      helpMessage: recommendedProfessionalHelp ? 
        "Te recomiendo buscar ayuda profesional para manejar mejor esta situación. Un especialista podrá brindarte el apoyo adecuado." : null
    });
  } catch (error) {
    console.error('Error al generar la respuesta:', error);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message 
    });
  }
};

// Obtener historial de conversaciones
export const getConversationHistory = async (req, res) => {
  try {
    const { category, severity, needsHelp } = req.query;
    const query = {};

    // Aplicar filtros si se proporcionan
    if (category) {
      query.category = category;
    }
    if (severity) {
      query.severity = severity;
    }
    if (needsHelp === 'true') {
      query.recommendedProfessionalHelp = true;
    }

    const conversations = await Conversation.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    // Agrupar conversaciones por categoría
    const groupedConversations = conversations.reduce((acc, conv) => {
      if (!acc[conv.category]) {
        acc[conv.category] = [];
      }
      acc[conv.category].push(conv);
      return acc;
    }, {});

    res.json({
      conversations: groupedConversations,
      stats: {
        total: conversations.length,
        byCategory: Object.keys(groupedConversations).reduce((acc, cat) => {
          acc[cat] = groupedConversations[cat].length;
          return acc;
        }, {}),
        needingProfessionalHelp: conversations.filter(c => c.recommendedProfessionalHelp).length
      }
    });
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial de conversaciones' });
  }
};

// Generar preguntas del quiz
export const generateQuiz = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'El tema es requerido' });
    }

    if (!['Arte', 'Entretenimiento', 'Deporte', 'Ciencia', 'Historia'].includes(topic)) {
      return res.status(400).json({ error: 'Tema no válido' });
    }

    if (!openai) {
      return res.status(500).json({ 
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI'
      });
    }

    const prompt = `Genera 5 preguntas de selección múltiple sobre ${topic}. 
    Cada pregunta debe tener 4 opciones de respuesta.
    Devuelve la respuesta en formato JSON con el siguiente formato:
    {
      "questions": [
        {
          "question": "pregunta aquí",
          "options": ["opción1", "opción2", "opción3", "opción4"],
          "correctAnswer": "opción correcta aquí"
        }
      ]
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Eres un generador de preguntas de quiz. Genera preguntas desafiantes pero justas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    const quizData = JSON.parse(response);

    res.json(quizData);
  } catch (error) {
    console.error('Error al generar el quiz:', error);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message 
    });
  }
};

// Guardar resultados del quiz
export const saveQuizResult = async (req, res) => {
  try {
    const { topic, questions, score } = req.body;

    const quizResult = new QuizResult({
      topic,
      questions,
      score
    });

    await quizResult.save();

    res.json({ 
      message: 'Resultados guardados correctamente',
      score: `${score}/5`
    });
  } catch (error) {
    console.error('Error al guardar los resultados:', error);
    res.status(500).json({ 
      error: 'Error al guardar los resultados',
      details: error.message 
    });
  }
};
