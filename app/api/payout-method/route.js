import { setPayoutMethod, getPreferredPayout } from '../../../lib/db';

export async function POST(req) {
  try {
    const { email, method, details } = await req.json();
    if (!email || !method) {
      return Response.json({ error: 'email and method required' }, { status: 400 });
    }
    const user = setPayoutMethod(email, method, details || {});
    return Response.json({ ok: true, preferred: user.preferredPayout, payouts: user.payouts });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });
  const preferred = getPreferredPayout(email);
  return Response.json({ preferred });
}
