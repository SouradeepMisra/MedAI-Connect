const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

// Shared by every email template below: calls Brevo's transactional email
// API and throws on failure, letting the caller decide what to do (log it,
// surface a clean error to the client, or — for a courtesy email like a
// booking receipt — just log it and move on).
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
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
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo send failed with status ${response.status}: ${body}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    'Reset your MedAI Connect password',
    `
      <p>We received a request to reset your MedAI Connect password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `
  );
}

interface BookingReceiptDetails {
  patientName: string;
  doctorName: string;
  specialization: string;
  date: string; // already formatted for display
  time: string;
  amount: number;
}

export async function sendBookingReceiptEmail(to: string, details: BookingReceiptDetails): Promise<void> {
  await sendEmail(
    to,
    'Your MedAI Connect appointment is confirmed',
    `
      <p>Hi ${details.patientName},</p>
      <p>Your appointment is confirmed:</p>
      <ul>
        <li><strong>Doctor:</strong> Dr. ${details.doctorName} (${details.specialization})</li>
        <li><strong>Date:</strong> ${details.date}</li>
        <li><strong>Time:</strong> ${details.time}</li>
        <li><strong>Amount:</strong> ${details.amount}</li>
      </ul>
      <p>You can cancel this appointment from "My Appointments" up to 48 hours before it starts.</p>
    `
  );
}
