import OpenAI from 'openai';

// Single shared client — reused by any feature that needs to call OpenAI
// (currently: doctor document verification; later: patient symptom chat).
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
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
