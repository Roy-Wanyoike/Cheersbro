import { createMagicToken } from '../../../lib/auth';
import { sendPaymentLink } from '../../../lib/email';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    const token = createMagicToken(email);
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const link = `${base}/auth/verify?token=${token}`;

    // Reuse email helper (demo logs to console)
    await sendPaymentLink({
      to: email,
      ref: 'LOGIN',
      amount: '',
      currency: '',
      link,
      creatorName: 'Cheersbro',
    });

    console.log(`[Magic Link] ${email} → ${link}`);

    return Response.json({ ok: true, message: 'Magic link sent (check server logs in demo)' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
