import { NextRequest, NextResponse } from 'next/server';
import { encerrarSessao } from '@/lib/conta-kv';

const COOKIE_NAME = 'fc_conta';

export async function POST(req: NextRequest) {
  await encerrarSessao(req.cookies.get(COOKIE_NAME)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
