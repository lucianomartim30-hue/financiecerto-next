/**
 * GET /api/admin/rastreio — relatório de visitantes anônimos (ver
 * lib/rastreio-kv.ts), separados em três grupos por sinal de intenção.
 * Exclui quem já é lead conhecido (lib/visitantes-kv.ts) — esse já aparece em
 * /admin/leads, não faz sentido duplicar aqui.
 * Protegido pela mesma senha do /admin/leads e /admin/promocoes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvListarRastreios, type RegistroAnonimo } from '@/lib/rastreio-kv';
import { kvListarIdsConhecidos } from '@/lib/visitantes-kv';
import { sessionToken } from '../../admin-auth/route';

const COOKIE_NAME = 'admin_leads_session';

function isAuthed(req: NextRequest): boolean {
  const configured = process.env.ADMIN_LEADS_PASSWORD;
  if (!configured) return false;
  return req.cookies.get(COOKIE_NAME)?.value === sessionToken(configured);
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const [registros, idsConhecidos] = await Promise.all([kvListarRastreios(), kvListarIdsConhecidos()]);
  const desconhecidos = registros.filter(r => !idsConhecidos.has(r.id));

  const potenciais = desconhecidos.filter(r => r.visitouSimulador && r.imoveisVistos.length === 0);
  const interessados = desconhecidos.filter(r => !r.visitouSimulador && r.imoveisVistos.length > 0);
  const altaIntencao = desconhecidos.filter(r => r.visitouSimulador && r.imoveisVistos.length > 0);
  const soListagem = desconhecidos.filter(r => !r.visitouSimulador && r.imoveisVistos.length === 0 && r.visitouListagemImoveis);

  const ordenar = (arr: RegistroAnonimo[]) => [...arr].sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita));

  return NextResponse.json({
    total: desconhecidos.length,
    altaIntencao: ordenar(altaIntencao),
    potenciais: ordenar(potenciais),
    interessados: ordenar(interessados),
    soListagem: ordenar(soListagem),
  });
}
