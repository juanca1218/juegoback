import express from 'express';
import { 
  generateChatResponse, 
  getConversationHistory, 
  generateQuiz,
  saveQuizResult 
} from '../controllers/chatController.js';

const router = express.Router();

// Ruta para generar respuestas de ChatGPT
router.post('/', generateChatResponse);
// Ruta para obtener el historial de conversaciones
router.get('/history', getConversationHistory);
// Rutas para el quiz
router.post('/quiz', generateQuiz);
router.post('/quiz/result', saveQuizResult);

export { router };
