import { Router } from 'express';
import { ChatLog } from '../models/ChatLog';
import { verifyToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getSymptomGuidanceReply } from '../services/symptomChatService';

const router = Router();

const MAX_MESSAGE_LENGTH = 1000;

router.use(verifyToken, requireRole('patient'));

// Materializes a patient's ChatLog the first time they chat, exactly like
// ensureSlot does for Slot documents — if two requests race to create the
// same patient's first ChatLog, only one insert can win (unique index on
// patient); the loser's upsert just matches the now-existing document
// instead of racing to insert again and crashing on the duplicate key.
async function ensureChatLog(patientId: string): Promise<InstanceType<typeof ChatLog>> {
  try {
    return await ChatLog.findOneAndUpdate(
      { patient: patientId },
      { $setOnInsert: { patient: patientId, messages: [] } },
      { upsert: true, new: true }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await ChatLog.findOne({ patient: patientId });
      if (existing) return existing;
    }
    throw error;
  }
}

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

    const chatLog = await ensureChatLog(req.user!.id);

    let reply: string;
    try {
      reply = await getSymptomGuidanceReply(chatLog.messages, message);
    } catch (aiError) {
      console.error('Symptom chat AI error:', aiError);
      // Nothing persisted — a failed attempt shouldn't leave a one-sided
      // turn in history the patient never actually saw a reply to.
      return res.status(502).json({ error: 'Something went wrong while getting a response. Please try again.' });
    }

    // Atomic $push rather than mutating the earlier-read document and
    // calling .save() — the in-memory chatLog.messages could already be
    // stale by now if another request's message landed in between.
    await ChatLog.updateOne(
      { patient: req.user!.id },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: message },
              { role: 'assistant', content: reply },
            ],
          },
        },
      }
    );

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: 'Something went wrong while sending your message' });
  }
});

export default router;
