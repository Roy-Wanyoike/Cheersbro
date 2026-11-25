import { getUser, getTransactions } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({ error: 'email required' }, { status: 400 });
  }

  const user = getUser(email);
  const transactions = getTransactions(email);

  return Response.json({
    email: user.email,
    balance: user.balance || 0,
    transactions,
  });
}
