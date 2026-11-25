import { sendPaymentLink } from '@/lib/email';

export async function POST(req) {
  try {
    const { email, ref, amount, currency, creatorName } = await req.json();
    if (!email || !ref) return Response.json({ error: 'email and ref required' }, { status: 400 });

    const link = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pay?ref=${ref}`;
    const result = await sendPaymentLink({ to: email, ref, amount, currency, link, creatorName });

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
