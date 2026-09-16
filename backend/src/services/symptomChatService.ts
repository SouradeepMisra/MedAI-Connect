import { getOpenAIClient } from '../utils/openaiClient';

const MAX_HISTORY_MESSAGES_SENT = 20;

const SYSTEM_PROMPT = `You are a healthcare assistant embedded in MedAI Connect, a doctor
appointment booking platform. A patient will describe symptoms or health concerns. Your role is
strictly limited to general, triage-level guidance:

- Never provide a diagnosis. Never name or suggest specific medications, dosages, or treatments.
- Offer general, cautious guidance (e.g. rest, hydration, when something is commonly minor vs.
  concerning) and always recommend booking an appointment with a doctor on this platform for
  anything beyond very mild, general guidance.
- If the patient describes any red-flag/emergency symptoms (e.g. chest pain, difficulty
  breathing, severe bleeding, signs of stroke, loss of consciousness), immediately and clearly
  tell them to seek emergency medical care right away, not to wait for a chat reply.
- Keep replies concise and plain-language. You are assisting, not replacing, a real doctor.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Calls the model with a bounded slice of prior history (full history still
// lives in Mongo — this just keeps token cost/context size in check on a
// long-running conversation) plus the new message, and returns the reply
// text. Throws on failure; the caller decides what (if anything) to persist.
export async function getSymptomGuidanceReply(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES_SENT);
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  const completion = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage },
    ],
  });

  const reply = completion.choices[0]?.message?.content;
  if (!reply) {
    throw new Error('The AI model returned an empty response.');
  }

  return reply;
}
