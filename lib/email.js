// Simple email helper. In production use Resend, SendGrid, or Nodemailer.
export async function sendPaymentLink({ to, ref, amount, currency, link, creatorName }) {
  // Demo: log the email. Replace with real provider.
  const subject = `Payment request from ${creatorName || 'Cheersbro'} – ${currency} ${amount}`;
  const body = `
Hi,

You have a payment request:

Amount: ${currency} ${amount}
Reference: ${ref}
Link: ${link}

This link stays in your browser. Anyone with it can pay.

— Cheersbro
  `.trim();

  console.log(`[Email] To: ${to}\nSubject: ${subject}\n${body}`);

  return { ok: true, demo: true };
}
