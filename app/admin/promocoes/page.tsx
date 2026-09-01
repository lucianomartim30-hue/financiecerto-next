'use client';

import { useState, useCallback } from 'react';
import type { Promocao } from '@/lib/promocoes-kv';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function estaVencida(p: Promocao): boolean {
  if (!p.validoAte) return false;
  return p.validoAte < new Date().toISOString().slice(0, 10);
}

// ─── Login (mesma senha do /admin/leads) ─────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setErro('Senha incorreta.'); return; }
      onSuccess();
    } catch {
      setErro('Erro ao entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔥 Promoções</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Acesso restrito — FinancieCerto</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') entrar(); }}
          placeholder="Senha"
          autoFocus
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}
        <button
          onClick={entrar}
          disabled={loading || !password}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px',
  fontSize: '13px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '.3px' };

// ─── Painel principal ───────────────────────────────────────────────────────
export default function AdminPromocoesPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [buildingId, setBuildingId] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const [unidade, setUnidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [areaM2, setAreaM2] = useState('');
  const [quartos, setQuartos] = useState('');
  const [vagas, setVagas] = useState('');
  const [andar, setAndar] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');
  const [precoPromocional, setPrecoPromocional] = useState('');
  const [beneficio, setBeneficio] = useState('');
  const [validoAte, setValidoAte] = useState('');
  const [observacao, setObservacao] = useState('');
  const [ultimaUnidade, setUltimaUnidade] = useState(false);
  const [investidorSCP, setInvestidorSCP] = useState(false);

  const limparFormulario = () => {
    setUnidade(''); setTipo(''); setAreaM2(''); setQuartos(''); setVagas(''); setAndar(''); setPrecoOriginal(''); setPrecoPromocional('');
    setBeneficio(''); setValidoAte(''); setObservacao(''); setUltimaUnidade(false); setInvestidorSCP(false);
  };

  const carregar = useCallback(async () => {
    const id = buildingId.trim();
    if (!id) return;
    setLoading(true);
    setErro('');
    setPromocoes([]);
    setBuildingName('');
    try {
      const res = await fetch(`/api/orulo/${encodeURIComponent(id)}`);
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setErro('Imóvel não encontrado.'); return; }
      const data = await res.json();
      if (!data.promocoes) { setErro('Sem permissão pra ver promoções — faça login de novo.'); return; }
      setBuildingName(data.name || '');
      setPromocoes(data.promocoes);
    } catch {
      setErro('Erro ao carregar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  async function adicionar() {
    const id = buildingId.trim();
    const preco = Number(precoPromocional.replace(/\D/g, ''));
    if (!id || !preco) return;
    setSalvando(true);
    try {
      const res = await fetch('/api/admin/promocoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: id,
          unidade: unidade.trim() || undefined,
          tipo: tipo.trim() || undefined,
          areaM2: areaM2 ? Number(areaM2) : undefined,
          quartos: quartos ? Number(quartos) : undefined,
          vagas: vagas ? Number(vagas) : undefined,
          andar: andar.trim() || undefined,
          precoOriginal: precoOriginal ? Number(precoOriginal.replace(/\D/g, '')) : undefined,
          precoPromocional: preco,
          ultimaUnidade: ultimaUnidade || undefined,
          investidorSCP: investidorSCP || undefined,
          beneficio: beneficio.trim() || undefined,
          validoAte: validoAte || undefined,
          observacao: observacao.trim() || undefined,
        }),
      });
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setErro('Erro ao salvar promoção.'); return; }
      limparFormulario();
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(promocaoId: string) {
    const id = buildingId.trim();
    setRemovendo(promocaoId);
    try {
      await fetch('/api/admin/promocoes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: id, promocaoId }),
      });
      setPromocoes(prev => prev.filter(p => p.id !== promocaoId));
    } finally {
      setRemovendo(null);
    }
  }

  if (authed === null) {
    fetch('/api/leads').then(res => setAuthed(res.status !== 401)).catch(() => setAuthed(false));
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔥 Promoções</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Condições especiais que você recebe direto da construtora (condomínio grátis, pontos, preço de unidade específica) — cole o id do empreendimento (o número no final da URL do imóvel no site) pra vincular. Se a construtora tem mais de uma unidade na mesma condição, cadastre uma promoção pra cada unidade — todas aparecem juntas no site, com suas próprias características.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={buildingId}
          onChange={e => setBuildingId(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') carregar(); }}
          placeholder="Id do empreendimento — ex: 66372"
          style={{ ...inputStyle, flex: 1, padding: '11px 14px', fontSize: '14px' }}
        />
        <button onClick={carregar} disabled={loading || !buildingId.trim()} style={{ padding: '11px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Carregando…' : 'Buscar'}
        </button>
      </div>

      {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{erro}</p>}

      {buildingName && (
        <>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>{buildingName}</p>

          {promocoes.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {promocoes.map(p => {
                const vencida = estaVencida(p);
                return (
                  <div key={p.id} style={{ padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', background: vencida ? 'var(--bg)' : 'var(--bg-card)', opacity: vencida ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                          {p.precoOriginal && p.precoOriginal > p.precoPromocional && (
                            <span style={{ fontWeight: '500', color: 'var(--text-faint)', textDecoration: 'line-through', marginRight: '6px' }}>{formatBRL(p.precoOriginal)}</span>
                          )}
                          {formatBRL(p.precoPromocional)}
                          {(p.tipo || p.unidade) && <span style={{ fontWeight: '500', color: 'var(--text-muted)' }}> — {p.tipo ? `${p.tipo} ` : ''}{p.unidade ? `unidade ${p.unidade}` : ''}{p.areaM2 ? ` (${p.areaM2}m²)` : ''}</span>}
                        </p>
                        {(p.andar || p.quartos !== undefined || p.vagas !== undefined) && (
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {[p.andar, p.quartos !== undefined ? `${p.quartos} qt${p.quartos === 1 ? '' : 's'}` : null, p.vagas !== undefined ? `${p.vagas} vg` : null].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {p.ultimaUnidade && <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>🏁 Última unidade dessa característica</p>}
                        {p.investidorSCP && <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', marginTop: '2px' }}>📈 Cota de investidor via SCP (pré-lançamento)</p>}
                        {p.beneficio && <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', marginTop: '2px' }}>🎁 {p.beneficio}</p>}
                        {p.validoAte && <p style={{ fontSize: '11px', color: vencida ? '#dc2626' : 'var(--text-faint)', marginTop: '2px' }}>{vencida ? 'Vencida em' : 'Válido até'} {new Date(p.validoAte + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                        {p.observacao && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{p.observacao}</p>}
                      </div>
                      <button
                        onClick={() => remover(p.id)}
                        disabled={removendo === p.id}
                        style={{ flexShrink: 0, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #dc2626', background: 'rgba(220,38,38,.08)', color: '#dc2626', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {removendo === p.id ? '…' : '🗑 Remover'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: '16px', border: '1.5px dashed var(--border)', borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>+ Adicionar promoção</p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '10px' }}>Tudo aqui aparece no card e na página do imóvel — unidade, andar, área, quartos, vagas e a economia (preço de tabela vs. promocional).</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Unidade</label>
                <input value={unidade} onChange={e => setUnidade(e.target.value)} placeholder="605" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Andar</label>
                <input value={andar} onChange={e => setAndar(e.target.value)} placeholder="6º andar" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Tipo (Garden, Duplex, Studio... deixe em branco se for apartamento comum)</label>
              <input value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Garden" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Área m²</label>
                <input value={areaM2} onChange={e => setAreaM2(e.target.value.replace(/\D/g, ''))} placeholder="28" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Quartos</label>
                <input value={quartos} onChange={e => setQuartos(e.target.value.replace(/\D/g, ''))} placeholder="2" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Vagas</label>
                <input value={vagas} onChange={e => setVagas(e.target.value.replace(/\D/g, ''))} placeholder="1" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Preço de tabela (original)</label>
                <input value={precoOriginal} onChange={e => setPrecoOriginal(e.target.value)} placeholder="780000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Preço promocional *</label>
                <input value={precoPromocional} onChange={e => setPrecoPromocional(e.target.value)} placeholder="649000" style={inputStyle} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={ultimaUnidade} onChange={e => setUltimaUnidade(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              É a última unidade dessa característica no empreendimento? (some a frase "demais unidades a partir de X", que ficaria falsa)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={investidorSCP} onChange={e => setInvestidorSCP(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              É cota de investidor via SCP (pré-lançamento, empreendimento ainda sem lançamento oficial)? Isso troca a linguagem do card pra "tipologia" em vez de "unidade", mostra um botão explicando SCP, e troca o selo de estágio pra "Breve Lançamento"
            </label>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Benefício</label>
              <input value={beneficio} onChange={e => setBeneficio(e.target.value)} placeholder="6 meses de condomínio grátis" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Válido até</label>
              <input type="date" value={validoAte} onChange={e => setValidoAte(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Observação</label>
              <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Sujeito a disponibilidade" style={inputStyle} />
            </div>
            <button
              onClick={adicionar}
              disabled={salvando || !precoPromocional.trim()}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}
            >
              {salvando ? 'Salvando…' : 'Salvar promoção'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
