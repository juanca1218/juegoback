// quizRoutes.js
import express from 'express';
import { generarPreguntasPorTema, obtenerHistorialDeSesion } from '../controllers/QuizController.js';

const router = express.Router();

// Ruta para generar preguntas de quiz basadas en el tema
router.post('/', generarPreguntasPorTema);

// Ruta para obtener el historial de sesiones de quiz
router.get('/history', obtenerHistorialDeSesion);

export { router };
