'use client';

/**
 * Bloco "Encontre o imóvel certo" — inserido nos simuladores após o resultado.
 *
 * Lógica:
 *  1. Usuário informa quartos, vagas e bairro desejado
 *  2. Busca imóveis com preço ±20% do valor simulado no bairro pedido
 *  3. Se não achar no bairro → busca em toda SP, ordena por distância e
 *     mostra mensagem explicando a realidade do mercado + alternativas próximas
 */

import { useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/calculos';
import { lookupSPCoords, haversineKm } from '@/lib/sp-neighborhoods';

interface ImovelCard {
  id: string;
  name: string;
  developer: string;
  neighborhood: string;
  city: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  area_min: number | null;
  vagas_min: number | null;
  photo: string | null;
  status: string;
  lat?: number | null;
  lng?: number | null;
}

interface Alternativa {
  neighborhood: string;
  count: number;
  distKm: number;
  imoveis: ImovelCard[];
}

const QUARTOS_OPT  = [1, 2, 3, 4] as const;
const VAGAS_OPT    = [0, 1, 2, 3] as const;

function chip(label: string, ativo: boolean, onClick: () => void) {
  return (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 99,
        border: `2px solid ${ativo ? 'var(--primary)' : 'var(--border)'}`,
        background: ativo ? 'var(--primary-light)' : 'var(--bg)',
        color: ativo ? 'var(--primary)' : 'var(--text-muted)',
        fontSize: 13, fontWeight: ativo ? 800 : 500,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function CardImovel({ im }: { im: ImovelCard }) {
  return (
    <Link
      href={`/imoveis/${im.id}`}
      style={{
        display: 'block', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', textDecoration: 'none',
      }}
    >
      <div style={{ height: 120, background: '#E2E8F0', position: 'relative', overflow: 'hidden' }}>
        {im.photo
          ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏢</div>
        }
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.name}</p>
        <p style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>📍 {im.neighborhood}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {im.bedrooms_min !== null && (
            <span style={{ fontSize: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px', fontWeight: 600, color: 'var(--text-muted)' }}>
              🛏 {im.bedrooms_min}{im.bedrooms_max && im.bedrooms_max !== im.bedrooms_min ? `–${im.bedrooms_max}` : ''} qts
            </span>
          )}
          {im.area_min !== null && (
            <span style={{ fontSize: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px', fontWeight: 600, color: 'var(--text-muted)' }}>
              ▦ {im.area_min}m²
            </span>
          )}
        </div>
        {im.min_price && (
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)' }}>{formatBRL(im.min_price)}</p>
        )}
      </div>
    </Link>
  );
}

export default function BuscaImoveisInteligente({
  valorImovel,
  naPlanta = false,
}: {
  valorImovel: number;
  naPlanta?: boolean;
}) {
  const [quartos, setQuartos] = useState<number | null>(null);
  const [vagas,   setVagas]   = useState<number | null>(null);
  const [bairro,  setBairro]  = useState('');
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const [resultados,   setResultados]   = useState<ImovelCard[]>([]);
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [semResultado, setSemResultado] = useState(false);

  const valorMin = Math.round(valorImovel * 0.80);
  const valorMax = Math.round(valorImovel * 1.20);

  function filtrarPorVagas(lista: ImovelCard[]) {
    if (vagas === null || vagas === 0) return lista;
    return lista.filter(b => (b.vagas_min ?? 0) >= vagas);
  }

  async function buscar() {
    if (!quartos) return;
    setLoading(true);
    setBuscado(false);
    setResultados([]);
    setAlternativas([]);
    setSemResultado(false);

    try {
      // ── Busca 1: com bairro se informado ──────────────────────────────
      const p1 = new URLSearchParams({
        all: '1',
        min_price: String(valorMin),
        max_price: String(valorMax),
        bedrooms_min: String(quartos),
        bedrooms_max: String(quartos >= 4 ? 99 : quartos),
      });
      if (bairro.trim()) p1.set('neighborhood', bairro.trim());
      if (naPlanta) p1.set('status', 'na planta');

      const d1 = await fetch(`/api/orulo?${p1}`).then(r => r.json());
      const r1  = filtrarPorVagas((d1.buildings ?? []) as ImovelCard[]);

      // Achou pelo menos 3 no bairro desejado → mostra direto
      if (r1.length >= 3 || !bairro.trim()) {
        setResultados(r1.slice(0, 6));
        setBuscado(true);
        return;
      }

      // ── Busca 2: sem filtro de bairro → busca em toda SP ─────────────
      const p2 = new URLSearchParams({
        all: '1',
        min_price: String(valorMin),
        max_price: String(valorMax),
        bedrooms_min: String(quartos),
        bedrooms_max: String(quartos >= 4 ? 99 : quartos),
      });
      if (naPlanta) p2.set('status', 'na planta');

      const d2 = await fetch(`/api/orulo?${p2}`).then(r => r.json());
      const r2  = filtrarPorVagas((d2.buildings ?? []) as ImovelCard[]);

      if (!r2.length) { setSemResultado(true); setBuscado(true); return; }

      // Calcula distância de cada imóvel até o bairro desejado
      const origem = lookupSPCoords(bairro.trim(), 'São Paulo');

      const comDist = r2.map(im => {
        const dest = (im.lat && im.lng)
          ? { lat: im.lat, lng: im.lng }
          : lookupSPCoords(im.neighborhood, im.city || 'São Paulo');
        const distKm = origem && dest
          ? haversineKm(origem.lat, origem.lng, dest.lat, dest.lng)
          : 999;
        return { ...im, _distKm: distKm };
      }).sort((a, b) => a._distKm - b._distKm);

      // Agrupa por bairro para mostrar alternativas organizadas
      const mapaNeighborhood = new Map<string, Alternativa>();
      for (const im of comDist) {
        const key = im.neighborhood;
        if (!mapaNeighborhood.has(key)) {
          const dest = lookupSPCoords(im.neighborhood, im.city || 'São Paulo');
          const distKm = origem && dest
            ? haversineKm(origem.lat, origem.lng, dest.lat, dest.lng)
            : 999;
          mapaNeighborhood.set(key, { neighborhood: key, count: 0, distKm, imoveis: [] });
        }
        const entry = mapaNeighborhood.get(key)!;
        entry.count++;
        if (entry.imoveis.length < 2) entry.imoveis.push(im);
      }

      const alts = [...mapaNeighborhood.values()]
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 5);

      setAlternativas(alts);
      setResultados(alts.flatMap(a => a.imoveis).slice(0, 6));
      setBuscado(true);
    } catch {
      setSemResultado(true);
      setBuscado(true);
    } finally {
      setLoading(false);
    }
  }

  const bairroDesejado = bairro.trim();
  const encontrouNoBairro = buscado && resultados.length > 0 && alternativas.length === 0;
  const expandiuBairro    = buscado && alternativas.length > 0;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1.5px solid var(--border)',
      borderRadius: 16, overflow: 'hidden', marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 16px', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
          FinancieCerto
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          🏠 Encontre o imóvel certo para você
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
          Orçamento: {formatBRL(valorMin)} – {formatBRL(valorMax)}
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Quartos */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            Quartos desejados *
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUARTOS_OPT.map(q => chip(q === 4 ? '4+' : String(q), quartos === q, () => setQuartos(quartos === q ? null : q)))}
          </div>
        </div>

        {/* Vagas */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            Vagas de garagem
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VAGAS_OPT.map(v => chip(v === 0 ? 'Sem vaga' : v === 3 ? '3+' : String(v), vagas === v, () => setVagas(vagas === v ? null : v)))}
          </div>
        </div>

        {/* Bairro */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            Bairro desejado <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </p>
          <input
            type="text"
            value={bairro}
            onChange={e => setBairro(e.target.value)}
            placeholder="Ex: Vila Mariana, Moema, Tatuapé..."
            style={{
              width: '100%', padding: '10px 14px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
              background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Botão buscar */}
        <button
          onClick={buscar}
          disabled={!quartos || loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: quartos ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--border)',
            color: quartos ? '#fff' : 'var(--text-faint)',
            fontSize: 15, fontWeight: 800, cursor: quartos ? 'pointer' : 'default',
            fontFamily: 'inherit', transition: 'all .2s',
          }}
        >
          {loading ? 'Buscando...' : 'Buscar empreendimentos compatíveis →'}
        </button>

        {/* ── Resultados ──────────────────────────────────────────────────── */}
        {buscado && (
          <div style={{ marginTop: 24 }}>

            {/* Sem resultado nenhum */}
            {semResultado && (
              <div style={{ padding: '16px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#854F0B', marginBottom: 6 }}>
                  😕 Nenhum imóvel encontrado
                </p>
                <p style={{ fontSize: 12, color: '#854F0B' }}>
                  Tente ampliar o perfil (mais quartos, sem filtro de vaga) ou ajuste o valor na simulação.
                </p>
              </div>
            )}

            {/* Encontrou no bairro desejado */}
            {encontrouNoBairro && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                  ✅ {resultados.length} imóveis encontrados{bairroDesejado ? ` em ${bairroDesejado}` : ''} no seu orçamento
                </p>
              </div>
            )}

            {/* Expandiu para bairros vizinhos */}
            {expandiuBairro && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#9A3412', marginBottom: 6 }}>
                  ⚠️ Seu perfil não encontrou {quartos} quarto{(quartos ?? 0) > 1 ? 's' : ''}{bairroDesejado ? ` em ${bairroDesejado}` : ''}
                </p>
                <p style={{ fontSize: 12, color: '#7C2D12', marginBottom: 10, lineHeight: 1.5 }}>
                  Com orçamento de <strong>{formatBRL(valorMax)}</strong>, encontramos imóveis compatíveis nos bairros abaixo.
                  Isso é comum: o m² em alguns bairros é mais caro do que o orçamento permite.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alternativas.map(alt => (
                    <div key={alt.neighborhood} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.7)', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>📍 {alt.neighborhood}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{alt.distKm < 100 ? `~${alt.distKm.toFixed(0)}km de ${bairroDesejado}` : 'São Paulo'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 99 }}>
                          {alt.count} imóv.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cards de imóveis */}
            {resultados.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                  {resultados.map(im => <CardImovel key={im.id} im={im} />)}
                </div>
                <Link
                  href={`/imoveis?min=${valorMin}&max=${valorMax}&bedrooms_min=${quartos}&bedrooms_max=${quartos ?? ''}${bairroDesejado && encontrouNoBairro ? `&neighborhood=${encodeURIComponent(bairroDesejado)}` : ''}${naPlanta ? '&status=na planta' : ''}`}
                  style={{
                    display: 'block', padding: '12px', borderRadius: 10,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    border: '1.5px solid rgba(37,99,235,.25)',
                    fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
                  }}
                >
                  Ver todos os empreendimentos compatíveis →
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
