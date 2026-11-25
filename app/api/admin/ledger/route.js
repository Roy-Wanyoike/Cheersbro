import { getLedgerEntries, getCompanyRevenue, getCashPosition } from '@/lib/ledger';

export async function GET() {
  return Response.json({
    entries: getLedgerEntries(30),
    companyRevenue: getCompanyRevenue(),
    cashPosition: getCashPosition(),
  });
}
