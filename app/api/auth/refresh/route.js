import { rotateRefresh } from '../../../lib/jwt';

export async function POST(req) {
  try {
    const { refresh } = await req.json();
    if (!refresh) return Response.json({ error: 'refresh required' }, { status: 400 });

    const result = rotateRefresh(refresh);
    if (result.error) {
      const status = result.error === 'reused' ? 401 : 400;
      return Response.json({ error: result.error }, { status });
    }

    return Response.json({
      access: result.access,
      refresh: result.refresh,
      email: result.email,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
