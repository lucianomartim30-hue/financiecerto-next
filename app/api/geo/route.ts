/**
 * GET /api/geo
 * Detecta o estado do visitante pelo IP (headers de geolocalização que a
 * Vercel já injeta em toda requisição, sem precisar pedir permissão do
 * navegador) e retorna as cidades liberadas dessa região, se houver.
 * Usado por /imoveis para mostrar primeiro os imóveis da região de quem
 * está acessando — SP vê SP, Curitiba vê Curitiba, etc.
 * Em localhost (sem headers da Vercel) retorna tudo nulo — comportamento
 * atual (mostra tudo) é preservado como fallback seguro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CIDADES_POR_ESTADO } from '@/lib/cidades-liberadas';

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country');
  const state   = req.headers.get('x-vercel-ip-country-region'); // ex: "SP", "PR"
  const city    = req.headers.get('x-vercel-ip-city');

  if (country !== 'BR' || !state) {
    return NextResponse.json({ state: null, city: null, cities: null });
  }

  const cities = CIDADES_POR_ESTADO[state.toUpperCase()] ?? null;

  return NextResponse.json({
    state,
    city: city ? decodeURIComponent(city) : null,
    cities,
  });
}
