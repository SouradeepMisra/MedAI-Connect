const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

// Thin wrapper around Brevo's transactional email API, same shape as
// aiVerificationService/symptomChatService: throws on failure and lets the
// caller decide what to do (log it, surface a clean error to the client).
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL must be set to send email');
  }

  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || 'MedAI Connect' },
      to: [{ email: to }],
      subject: 'Reset your MedAI Connect password',
      htmlContent: `
        <p>We received a request to reset your MedAI Connect password.</p>
        <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo send failed with status ${response.status}: ${body}`);
  }
}
