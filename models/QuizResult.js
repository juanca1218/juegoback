import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    enum: ['Arte', 'Entretenimiento', 'Deporte', 'Ciencia', 'Historia']
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    userAnswer: String
  }],
  score: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;
