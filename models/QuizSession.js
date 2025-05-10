// QuizSession.js
import mongoose from 'mongoose';

const quizSessionSchema = new mongoose.Schema({
  tema: {
    type: String,
    required: true
  },
  questions: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);

export default QuizSession;
