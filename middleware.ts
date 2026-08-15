import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Configuração ──────────────────────────────────────────────────────────────
const PRODUCTION_HOST = 'www.financiecerto.com.br';

// VERCEL_ENV é injetado automaticamente pela Vercel:
//   'production'  → deploy de produção (main branch)
//   'preview'     → deploy de PR / branch (URLs únicas geradas automaticamente)
//   'development' → next dev local
//
// Estratégia:
//   - Se o host termina em .vercel.app E o ambiente é 'production'
//     → redireciona 301 para o domínio real (financiecerto.com.br)
//   - Se é preview (.vercel.app mas VERCEL_ENV === 'preview')
//     → deixa passar (time interno precisa acessar)
//   - Se é o domínio real (www.financiecerto.com.br ou financiecerto.com.br)
//     → redireciona sem-www → com-www (canonical único)
// ─────────────────────────────────────────────────────────────────────────────

// ── Visitor ID ───────────────────────────────────────────────────────────────
// Cookie anônimo (fc_vid) que identifica o navegador entre visitas, sem exigir
// login — mesma lógica que portais como o ImovelWeb usam. Sozinho não revela
// quem é a pessoa; só passa a ter valor quando ela se identifica uma vez (clique
// de WhatsApp ou formulário de contato em /imoveis/[id]), momento em que o lead
// grava esse ID junto (ver app/api/leads/route.ts) — daí em diante, as próximas
// visitas com o mesmo cookie são reconhecidas como o mesmo lead.
const VISITOR_COOKIE = 'fc_vid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 730; // 2 anos

function ensureVisitorCookie(request: NextRequest, res: NextResponse): NextResponse {
  if (!request.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      maxAge: VISITOR_MAX_AGE,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return res;
}

export function middleware(request: NextRequest) {
  const host   = (request.headers.get('host') ?? '').toLowerCase();
  const isVercel  = host.endsWith('.vercel.app');
  const isPreview = process.env.VERCEL_ENV === 'preview';

  // ── 1. Domínio Vercel de produção → redireciona para o domínio real ─────────
  if (isVercel && !isPreview) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host     = PRODUCTION_HOST;
    url.port     = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── 2. Preview do Vercel → acesso liberado, mas sem indexação ───────────────
  if (isVercel && isPreview) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return ensureVisitorCookie(request, res);
  }

  // ── 3. financiecerto.com.br (sem www) → redireciona para www ────────────────
  if (host === 'financiecerto.com.br') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host     = PRODUCTION_HOST;
    url.port     = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  return ensureVisitorCookie(request, NextResponse.next());
}

export const config = {
  // Exclui assets estáticos, imagens otimizadas e favicon — só aplica em rotas reais
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
