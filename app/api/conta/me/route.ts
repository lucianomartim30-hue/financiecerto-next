import { NextRequest, NextResponse } from 'next/server';
import { getEmailDaSessao } from '@/lib/conta-kv';

export async function GET(req: NextRequest) {
  const email = await getEmailDaSessao(req.cookies.get('fc_conta')?.value);
  return NextResponse.json({ email });
}
