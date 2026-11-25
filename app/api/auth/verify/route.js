import { verifyMagicToken, createSession } from '../../../lib/auth';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return Response.json({ error: 'token required' }, { status: 400 });

  const email = verifyMagicToken(token);
  if (!email) return Response.json({ error: 'Invalid or expired token' }, { status: 400 });

  const session = createSession(email);
  return Response.json({ ok: true, email, session });
}
