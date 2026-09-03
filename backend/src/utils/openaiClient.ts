import OpenAI from 'openai';

// Single shared client — reused by any feature that needs to call OpenAI
// (currently: doctor document verification; later: patient symptom chat).
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
