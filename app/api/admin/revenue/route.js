import { getCompanyWallet } from '@/lib/db';
import { getFeePercent } from '@/lib/fees';

export async function GET() {
  const company = getCompanyWallet();
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todayEarnings = (company.earnings || [])
    .filter(e => e.at?.startsWith(today))
    .reduce((s, e) => s + e.amount, 0);

  const monthEarnings = (company.earnings || [])
    .filter(e => e.at?.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);

  return Response.json({
    balance: company.balance || 0,
    today: Number(todayEarnings.toFixed(2)),
    month: Number(monthEarnings.toFixed(2)),
    feePercent: getFeePercent(),
    recent: (company.earnings || []).slice(0, 20),
  });
}
