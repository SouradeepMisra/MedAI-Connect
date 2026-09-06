import fs from 'fs';
import path from 'path';
import { getOpenAIClient } from '../utils/openaiClient';
import { Doctor } from '../models/Doctor';

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

type MatchVerdict = 'match' | 'mismatch' | 'uncertain';

export interface AiVerificationResult {
  status: 'Completed' | 'Failed';
  modelUsed?: string;
  extractedName?: string;
  extractedRegistrationNumber?: string;
  extractedDegree?: string;
  nameMatch?: MatchVerdict;
  registrationNumberMatch?: MatchVerdict;
  degreeMatch?: MatchVerdict;
  concerns?: string[];
  summary?: string;
  errorMessage?: string;
}

const responseSchema = {
  type: 'object',
  properties: {
    extractedName: { type: ['string', 'null'] },
    extractedRegistrationNumber: { type: ['string', 'null'] },
    extractedDegree: { type: ['string', 'null'] },
    nameMatch: { type: 'string', enum: ['match', 'mismatch', 'uncertain'] },
    registrationNumberMatch: { type: 'string', enum: ['match', 'mismatch', 'uncertain'] },
    degreeMatch: { type: 'string', enum: ['match', 'mismatch', 'uncertain'] },
    concerns: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: [
    'extractedName',
    'extractedRegistrationNumber',
    'extractedDegree',
    'nameMatch',
    'registrationNumberMatch',
    'degreeMatch',
    'concerns',
    'summary',
  ],
  additionalProperties: false,
};

// Reads the doctor's uploaded document and asks a vision-capable model to
// extract what it can read, then judge it against the doctor's submitted
// form data. This never decides Approved/Rejected on its own — it only
// hands the admin a structured, second opinion to review alongside the
// original document.
export async function verifyDoctorDocument(
  doctor: InstanceType<typeof Doctor>
): Promise<AiVerificationResult> {
  const ext = path.extname(doctor.documentPath).toLowerCase();
  const mimeType = SUPPORTED_IMAGE_TYPES[ext];

  if (!mimeType) {
    return {
      status: 'Failed',
      errorMessage: `Unsupported file type "${ext || 'unknown'}" for automated AI check — please review the document manually.`,
    };
  }

  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o';

  try {
    const imageBuffer = fs.readFileSync(doctor.documentPath);
    const base64Image = imageBuffer.toString('base64');

    const completion = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are assisting a hospital admin in verifying a doctor\'s registration ' +
            'document. Read the attached image and extract the doctor\'s name, medical ' +
            'registration number, and degree as printed on the document. Compare each to the ' +
            'values the doctor submitted in their registration form. For each field, judge ' +
            '"match" (clearly the same), "mismatch" (clearly different), or "uncertain" (the ' +
            'document is unclear, illegible, or does not show that field). List any concerns ' +
            '(e.g. signs of tampering, poor image quality, cropped text). Write a short, ' +
            'plain-language summary for the admin. You are not making the approval decision — ' +
            'only reporting what you observe.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Submitted form data:\n` +
                `Name: ${doctor.name}\n` +
                `Registration Number: ${doctor.registrationNumber}\n` +
                `Degree: ${doctor.degree}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'doctor_document_verification',
          schema: responseSchema,
          strict: true,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return { status: 'Failed', errorMessage: 'The AI model returned an empty response.' };
    }

    const parsed = JSON.parse(rawContent);

    return {
      status: 'Completed',
      modelUsed: model,
      extractedName: parsed.extractedName ?? undefined,
      extractedRegistrationNumber: parsed.extractedRegistrationNumber ?? undefined,
      extractedDegree: parsed.extractedDegree ?? undefined,
      nameMatch: parsed.nameMatch,
      registrationNumberMatch: parsed.registrationNumberMatch,
      degreeMatch: parsed.degreeMatch,
      concerns: parsed.concerns ?? [],
      summary: parsed.summary,
    };
  } catch (error) {
    console.error('AI document verification error:', error);
    return {
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error during AI verification',
    };
  }
}
