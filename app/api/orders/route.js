import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(
  process.env.VERCEL ? '/tmp/cheersbro-data' : path.join(process.cwd(), 'data'),
  'orders.json'
);

function loadOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

  const orders = loadOrders();
  const list = Object.values(orders)
    .filter(o => o.email === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

  return Response.json({ orders: list });
}
