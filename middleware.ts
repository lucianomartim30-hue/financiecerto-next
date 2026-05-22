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
    return res;
  }

  // ── 3. financiecerto.com.br (sem www) → redireciona para www ────────────────
  if (host === 'financiecerto.com.br') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host     = PRODUCTION_HOST;
    url.port     = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  // Exclui assets estáticos, imagens otimizadas e favicon — só aplica em rotas reais
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
