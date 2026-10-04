import OpenAI from 'openai';

// Single shared client — reused by any feature that needs to call an AI
// model (doctor document verification, patient symptom chat). Talks to the
// OpenAI API by default, but OPENAI_BASE_URL lets it point at any other
// OpenAI-compatible endpoint instead (e.g. Google Gemini's free tier via
// https://generativelanguage.googleapis.com/v1beta/openai/) without any
// code change in the services that use it — they only know model names,
// which are already configuration (OPENAI_VISION_MODEL / OPENAI_CHAT_MODEL).
//
// Built lazily, not at module scope: index.ts's import chain (index.ts ->
// adminRoutes.ts -> aiVerificationService.ts -> this file) runs before
// dotenv.config() executes, so process.env.OPENAI_API_KEY would still be
// undefined if the client were constructed at import time — crashing the
// whole server on startup outside Docker (where env_file injects the var
// before Node even starts, masking the issue).
let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined, // unset -> SDK default (api.openai.com)
    });
  }
  return client;
}
