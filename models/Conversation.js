import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['ansiedad', 'depresion', 'estres_academico', 'otro'],
    default: 'otro'
  },
  keywords: [{
    type: String
  }],
  severity: {
    type: String,
    enum: ['leve', 'moderado', 'grave', 'no_especificado'],
    default: 'no_especificado'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  recommendedProfessionalHelp: {
    type: Boolean,
    default: false
  }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
