import { getSettlement } from '@/lib/settlement';

export async function GET() {
  return Response.json(getSettlement());
}
