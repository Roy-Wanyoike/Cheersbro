import { setPayoutMethod, getPayoutMethods, setPreferredPayout, getPreferredPayout } from '../../../lib/db';

export async function POST(req) {
  try {
    const { email, method, details, setPreferred = true } = await req.json();
    if (!email || !method) {
      return Response.json({ error: 'email and method required' }, { status: 400 });
    }
    const user = setPayoutMethod(email, method, details || {}, setPreferred);
    return Response.json({
      ok: true,
      preferred: user.preferredPayout,
      methods: user.payouts,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });
  return Response.json({
    methods: getPayoutMethods(email),
    preferred: getPreferredPayout(email),
  });
}

export async function PUT(req) {
  try {
    const { email, method } = await req.json();
    if (!email || !method) return Response.json({ error: 'email and method required' }, { status: 400 });
    const user = setPreferredPayout(email, method);
    if (!user) return Response.json({ error: 'Method not connected' }, { status: 400 });
    return Response.json({ ok: true, preferred: user.preferredPayout });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
