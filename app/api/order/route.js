import { getUser, updateUser } from '@/lib/db';

import fs from 'fs';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

function loadOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
}

function saveOrders(orders) {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { amount, currency, email, firstName, lastName, message, mode } = body;

    if (!amount || !email) {
      return Response.json({ error: 'amount and email required' }, { status: 400 });
    }

    const ref = `CB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const order = {
      ref,
      amount: Number(amount),
      currency: currency || 'USD',
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      message: message || '',
      mode: mode || 'deposit',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const orders = loadOrders();
    orders[ref] = order;
    saveOrders(orders);

    return Response.json({ ref, order });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  if (!ref) return Response.json({ error: 'ref required' }, { status: 400 });

  const orders = loadOrders();
  const order = orders[ref];
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

  return Response.json({ order });
}
