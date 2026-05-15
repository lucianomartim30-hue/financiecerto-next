'use client';

import { useState } from 'react';
import { descobrir, formatBRL, type ResultadoDescobrir } from '@/lib/calculos';
import Link from 'next/link';

type Etapa = 'form' | 'resultado';
type TipoImovel = 'pronto' | 'na_planta';

export default function SimuladorPage() {
  const [etapa, setEtapa] = useState<Etapa>('form');
  const [resultado, setResultado] = useState<ResultadoDescobrir | null>(null);
  const [tipoImovel, setTipoImovel] = useState<TipoImovel>('pronto');

  const [renda, setRenda] = useState('');
  const [fgts, setFgts] = useState('');
  const [entrada, setEntrada] = useState('');
  const [prazo, setPrazo] = useState('35');
  const [erro, setErro] = useState('');

  function parseMoeda(val: string): number {
    return Number(val.replace(/\D/g, ''));
  }

  function formatarInput(val: string): string {
    const num = val.replace(/\D/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('pt-BR');
  }

  function handleCalcular() {
    const r = parseMoeda(renda);
    const f = parseMoeda(fgts);
    const e = parseMoeda(entrada);
    const p = parseInt(prazo);

    if (!r || r < 1000) {
      setErro('Informe uma renda bruta válida (mínimo R$ 1.000).');
      return;
    }
    setErro('');
    const res = descobrir(r, f, e, p);
    setResultado(res);
    setEtapa('resultado');
  }

  if (etapa === 'resultado' && resultado) {
    return (
      <Resultado
        resultado={resultado}
        tipoImovel={tipoImovel}
        onVoltar={() => setEtapa('form')}
      />
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', letterSpacing: '0.5px', marginBottom: '8px' }}>
            ETAPA 1 DE 2
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1c1917', marginBottom: '8px' }}>
            Qual é o seu perfil financeiro?
          </h1>
          <p style={{ color: '#78716c', fontSize: '16px' }}>
            Com base na sua renda, calculamos quanto você consegue financiar e quais imóveis são compatíveis.
          </p>
        </div>

        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #e7e5e4', padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>

          {/* Tipo de imóvel */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1c1917', marginBottom: '10px' }}>
              Qual tipo de imóvel você quer comprar?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {([
                { key: 'pronto',    emoji: '🏠', label: 'Pronto',    desc: 'Já construído' },
                { key: 'na_planta', emoji: '🏗️', label: 'Na Planta', desc: 'Em construção' },
              ] as { key: TipoImovel; emoji: string; label: string; desc: string }[]).map(({ key, emoji, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setTipoImovel(key)}
                  style={{
                    padding: '14px 12px', borderRadius: '12px', cursor: 'pointer',
                    border: '2px solid',
                    borderColor: tipoImovel === key ? '#2563eb' : '#e7e5e4',
                    background:  tipoImovel === key ? '#eff6ff' : '#fff',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{emoji}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: tipoImovel === key ? '#2563eb' : '#1c1917' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#78716c' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Campo
            label="Renda bruta mensal *"
            hint="Soma de todos os rendimentos do comprador"
            value={renda}
            onChange={v => setRenda(formatarInput(v))}
            prefix="R$"
            placeholder="5.000"
          />

          <Campo
            label="FGTS disponível"
            hint="Saldo que pode ser usado como parte da entrada"
            value={fgts}
            onChange={v => setFgts(formatarInput(v))}
            prefix="R$"
            placeholder="0"
          />

          <Campo
            label="Recursos próprios (entrada)"
            hint="Dinheiro em conta, além do FGTS"
            value={entrada}
            onChange={v => setEntrada(formatarInput(v))}
            prefix="R$"
            placeholder="0"
          />

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1c1917', marginBottom: '6px' }}>
              Prazo desejado
            </label>
            <select
              value={prazo}
              onChange={e => setPrazo(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '10px',
                border: '1.5px solid #e7e5e4', fontSize: '15px',
                background: '#fff', color: '#1c1917', outline: 'none',
              }}
            >
              <option value="20">20 anos</option>
              <option value="25">25 anos</option>
              <option value="30">30 anos</option>
              <option value="35">35 anos (máximo)</option>
            </select>
          </div>

          {erro && (
            <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px' }}>
              {erro}
            </p>
          )}

          <button
            onClick={handleCalcular}
            style={{
              width: '100%', background: '#2563eb', color: '#ffffff',
              border: 'none', borderRadius: '12px', padding: '14px',
              fontSize: '16px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Calcular meu perfil →
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#78716c', fontSize: '13px', marginTop: '16px' }}>
          Seus dados não são armazenados. Simulação gratuita.
        </p>
      </div>
    </div>
  );
}

// ─── Campo de input ────────────────────────────────────────────────────────────
function Campo({ label, hint, value, onChange, prefix, placeholder }: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; prefix?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1c1917', marginBottom: '4px' }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: '12px', color: '#78716c', marginBottom: '6px' }}>{hint}</p>}
      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e7e5e4', borderRadius: '10px', background: '#fff', overflow: 'hidden' }}>
        {prefix && (
          <span style={{ padding: '12px 14px', color: '#78716c', fontSize: '15px', fontWeight: '500', background: '#fafaf9', borderRight: '1px solid #e7e5e4' }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '12px 14px', border: 'none', outline: 'none',
            fontSize: '15px', color: '#1c1917', background: 'transparent',
          }}
        />
      </div>
    </div>
  );
}

// ─── Resultado ─────────────────────────────────────────────────────────────────
function Resultado({
  resultado,
  tipoImovel,
  onVoltar,
}: {
  resultado: ResultadoDescobrir;
  tipoImovel: TipoImovel;
  onVoltar: () => void;
}) {
  const { mcmv, sbpe, oruloMinPrice, oruloMaxPrice } = resultado;
  const valorSugerido = mcmv.elegivel ? mcmv.valorMaxImovel : sbpe.valorMaxImovel;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', letterSpacing: '0.5px', marginBottom: '8px' }}>
            ETAPA 2 DE 2
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1c1917', marginBottom: '8px' }}>
            Seu perfil de compra
          </h1>
          <p style={{ color: '#78716c', fontSize: '16px' }}>
            Com renda de {formatBRL(resultado.rendaBruta)}/mês e entrada de {formatBRL(resultado.entrada)}, você pode comprar:
          </p>
        </div>

        {/* Card MCMV */}
        {mcmv.elegivel && (
          <CardCenario
            badge="MINHA CASA MINHA VIDA"
            badgeColor="#16a34a"
            titulo="Até"
            valor={formatBRL(mcmv.valorMaxImovel)}
            itens={[
              { label: 'Parcela estimada', valor: formatBRL(mcmv.parcela) + '/mês' },
              { label: 'Comprometimento de renda', valor: mcmv.comprometimento.toFixed(1) + '%' },
              { label: 'Taxa de juros', valor: '7,66% a.a.' },
              { label: 'Financiado', valor: formatBRL(mcmv.valorFinanciado) },
            ]}
            destaque="Menor taxa de juros. Inclui subsídio do governo para renda até R$ 8.000."
          />
        )}

        {/* Card SBPE */}
        <CardCenario
          badge="SBPE / MERCADO"
          badgeColor="#2563eb"
          titulo="Até"
          valor={formatBRL(sbpe.valorMaxImovel)}
          itens={[
            { label: 'Parcela estimada', valor: formatBRL(sbpe.parcela) + '/mês' },
            { label: 'Comprometimento de renda', valor: sbpe.comprometimento.toFixed(1) + '%' },
            { label: 'Taxa de juros', valor: '10,5% a.a.' },
            { label: 'Financiado', valor: formatBRL(sbpe.valorFinanciado) },
          ]}
          destaque="Para imóveis acima de R$ 350 mil ou renda acima de R$ 8.000."
        />

        {/* CTA Imóveis */}
        <div style={{
          background: '#eff6ff', borderRadius: '16px', padding: '24px',
          border: '1px solid #bfdbfe', marginTop: '8px', marginBottom: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontWeight: '600', color: '#1c1917', marginBottom: '8px', fontSize: '16px' }}>
            Ver imóveis compatíveis com seu perfil
          </p>
          <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '16px' }}>
            Filtramos automaticamente imóveis entre {formatBRL(oruloMinPrice)} e {formatBRL(oruloMaxPrice)}
          </p>
          <Link href={`/imoveis?min=${oruloMinPrice}&max=${oruloMaxPrice}`} style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 28px', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer',
            }}>
              Ver imóveis compatíveis →
            </button>
          </Link>
        </div>

        {/* CTA Na Planta — só aparece se o usuário selecionou "na planta" */}
        {tipoImovel === 'na_planta' && (
          <div style={{
            background: '#1c1917', borderRadius: '16px', padding: '24px',
            marginBottom: '16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
              🏗️ Simule o pagamento durante a obra
            </p>
            <p style={{ fontSize: '13px', color: '#a8a29e', marginBottom: '16px' }}>
              Configure ato, mensais, sinais, anuais e chaves — e veja se o fluxo cabe no seu orçamento.
            </p>
            <Link
              href={`/simulador/na-planta?renda=${resultado.rendaBruta}&valor=${Math.round(valorSugerido)}`}
              style={{ textDecoration: 'none' }}
            >
              <button style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '12px 28px', fontSize: '15px',
                fontWeight: '600', cursor: 'pointer',
              }}>
                Simular pagamento na planta →
              </button>
            </Link>
          </div>
        )}

        <button
          onClick={onVoltar}
          style={{
            background: 'transparent', color: '#78716c', border: 'none',
            fontSize: '14px', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          ← Refazer simulação
        </button>
      </div>
    </div>
  );
}

// ─── Card de cenário ───────────────────────────────────────────────────────────
function CardCenario({ badge, badgeColor, titulo, valor, itens, destaque }: {
  badge: string; badgeColor: string; titulo: string; valor: string;
  itens: { label: string; valor: string }[]; destaque: string;
}) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4',
      padding: '24px', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <span style={{
        display: 'inline-block', background: badgeColor + '15',
        color: badgeColor, fontSize: '11px', fontWeight: '700',
        padding: '3px 10px', borderRadius: '99px', marginBottom: '12px',
        letterSpacing: '0.5px',
      }}>
        {badge}
      </span>
      <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '2px' }}>{titulo}</p>
      <p style={{ fontSize: '32px', fontWeight: '700', color: '#1c1917', marginBottom: '16px' }}>
        {valor}
      </p>
      <div style={{ borderTop: '1px solid #e7e5e4', paddingTop: '16px' }}>
        {itens.map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: '8px', fontSize: '14px',
          }}>
            <span style={{ color: '#78716c' }}>{item.label}</span>
            <span style={{ fontWeight: '600', color: '#1c1917' }}>{item.valor}</span>
          </div>
        ))}
      </div>
      <p style={{
        marginTop: '12px', fontSize: '13px', color: '#78716c',
        background: '#fafaf9', padding: '10px 12px', borderRadius: '8px',
      }}>
        ℹ️ {destaque}
      </p>
    </div>
  );
}
