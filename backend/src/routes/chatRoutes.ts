import { Router } from 'express';
import { ChatLog } from '../models/ChatLog';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getSymptomGuidanceReply } from '../services/symptomChatService';

const router = Router();

const MAX_MESSAGE_LENGTH = 1000;

router.use(verifyToken, requireRole('patient'));

// The patient's ongoing conversation, if any — no auto-create here, an empty
// list just means they haven't started chatting yet.
router.get('/history', async (req: AuthenticatedRequest, res) => {
  try {
    const chatLog = await ChatLog.findOne({ patient: req.user!.id });
    res.status(200).json({ messages: chatLog?.messages ?? [] });
  } catch (error) {
    console.error('Fetch chat history error:', error);
    res.status(500).json({ error: 'Something went wrong while fetching chat history' });
  }
});

router.post('/message', async (req: AuthenticatedRequest, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A message is required' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    }

    let chatLog = await ChatLog.findOne({ patient: req.user!.id });
    if (!chatLog) {
      chatLog = new ChatLog({ patient: req.user!.id, messages: [] });
    }

    let reply: string;
    try {
      reply = await getSymptomGuidanceReply(chatLog.messages, message);
    } catch (aiError) {
      console.error('Symptom chat AI error:', aiError);
      // Nothing persisted — a failed attempt shouldn't leave a one-sided
      // turn in history the patient never actually saw a reply to.
      return res.status(502).json({ error: 'Something went wrong while getting a response. Please try again.' });
    }

    chatLog.messages.push({ role: 'user', content: message });
    chatLog.messages.push({ role: 'assistant', content: reply });
    await chatLog.save();

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: 'Something went wrong while sending your message' });
  }
});

export default router;
