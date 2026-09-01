'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';

interface Alerta {
  id: string;
  descricaoFiltros: string;
  filtrosQuery: string;
  criadoEm: string;
}
interface Contato {
  id: string;
  imovelId: string;
  imovelName: string;
  criadoEm: string;
}
interface Simulacao {
  id: string;
  criadoEm: string;
  modalidade: string;
  valorImovel: number;
  valorFinanciado: number;
  parcelaPrice: number;
  parcelaSAC: number;
  taxaAnual: number;
  prazoAnos: number;
  comprometimento: number;
}
interface BuildingResumo {
  id: string;
  name: string;
  photo: string | null;
  neighborhood: string;
  city: string;
  min_price: number | null;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatBRL(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// ─── Login: e-mail → código de 6 dígitos ─────────────────────────────────────
function LoginForm({ onEntrar }: { onEntrar: (email: string) => void }) {
  const [passo, setPasso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviarCodigo() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro('Informe um e-mail válido.'); return; }
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/conta/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setErro(data?.error || 'Não foi possível enviar.'); return; }
      setPasso('codigo');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarCodigo() {
    if (codigo.trim().length !== 6) { setErro('Digite os 6 dígitos do código.'); return; }
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/conta/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codigo.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setErro(data?.error || 'Código inválido.'); return; }
      onEntrar(data.email);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (passo === 'codigo') {
    return (
      <>
        <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>📩 Digite o código</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
          Enviamos um código de 6 dígitos pra <strong>{email.trim()}</strong>. Ele expira em 10 minutos.
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={codigo}
          onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => { if (e.key === 'Enter') confirmarCodigo(); }}
          placeholder="000000"
          autoFocus
          style={{ width: '100%', padding: '14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '24px', fontWeight: '800', letterSpacing: '8px', textAlign: 'center', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}
        <button onClick={confirmarCodigo} disabled={enviando || codigo.length !== 6} className="btn-primary" style={{ width: '100%', opacity: enviando ? 0.7 : 1, marginBottom: '10px' }}>
          {enviando ? 'Confirmando…' : 'Entrar'}
        </button>
        <button onClick={() => { setPasso('email'); setCodigo(''); setErro(''); }}
          style={{ width: '100%', padding: '9px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-faint)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
          Errei o e-mail / pedir novo código
        </button>
      </>
    );
  }

  return (
    <>
      <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>👤 Minha conta</p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
        Sem senha — informe seu e-mail e enviamos um código de 6 dígitos. Use pra ver suas simulações, favoritos, alertas e contatos, em qualquer aparelho.
        <br />Navegar e simular no FinancieCerto <strong>nunca</strong> exige conta.
      </p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') enviarCodigo(); }}
        placeholder="seuemail@exemplo.com"
        autoFocus
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
      />
      {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}
      <button onClick={enviarCodigo} disabled={enviando || !email} className="btn-primary" style={{ width: '100%', opacity: enviando ? 0.7 : 1 }}>
        {enviando ? 'Enviando…' : 'Enviar código de acesso'}
      </button>
    </>
  );
}

// ─── Reenviar uma simulação salva por e-mail ─────────────────────────────────
function BotaoReenviar({ email, sim }: { email: string; sim: Simulacao }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle');

  async function reenviar() {
    setEstado('enviando');
    try {
      const res = await fetch('/api/conta/enviar-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resumo: sim }),
      });
      setEstado(res.ok ? 'enviado' : 'idle');
    } catch {
      setEstado('idle');
    }
  }

  if (estado === 'enviado') return <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>✓ Enviado</span>;
  return (
    <button onClick={reenviar} disabled={estado === 'enviando'}
      style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
      {estado === 'enviando' ? 'Enviando…' : '📧 Reenviar'}
    </button>
  );
}

// ─── Área logada ──────────────────────────────────────────────────────────────
function Dashboard({ email, onSair }: { email: string; onSair: () => void }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [favoritoIds, setFavoritoIds] = useState<string[]>([]);
  const [vistosIds, setVistosIds] = useState<string[]>([]);
  const [catalogo, setCatalogo] = useState<Record<string, BuildingResumo>>({});
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/conta/dados');
    const data = await res.json().catch(() => null);
    setAlertas(data?.alertas || []);
    setContatos(data?.contatos || []);
    setSimulacoes(data?.simulacoes || []);
    setFavoritoIds(data?.favoritoIds || []);
    setVistosIds(data?.vistosIds || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(data => {
        const map: Record<string, BuildingResumo> = {};
        for (const b of (data.buildings || [])) map[b.id] = b;
        setCatalogo(map);
      })
      .catch(() => {});
  }, []);

  async function cancelarAlerta(id: string) {
    setCancelando(id);
    try {
      await fetch(`/api/buscas-salvas/${id}`, { method: 'PATCH' });
      setAlertas(prev => prev.filter(a => a.id !== id));
    } finally {
      setCancelando(null);
    }
  }

  async function removerSimulacao(id: string) {
    setCancelando(id);
    try {
      await fetch('/api/simulacoes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setSimulacoes(prev => prev.filter(s => s.id !== id));
    } finally {
      setCancelando(null);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>👤 Minha conta</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{email}</p>
        </div>
        <button onClick={onSair} style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Sair
        </button>
      </div>

      {/* Mensagem de posicionamento — o "porquê" de ter uma conta aqui */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: '14px', padding: '18px 20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', color: '#fff', fontWeight: '700', marginBottom: '6px' }}>
          🏠 Aqui você não precisa de outro portal
        </p>
        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.8)', lineHeight: 1.6 }}>
          Busque, simule e já tenha atendimento pronto pra agendar visita ou tirar qualquer dúvida — tudo de graça.
          Nosso portfólio reúne lançamentos de incorporadoras e construtoras — MCMV, médio e alto padrão — sempre
          <strong style={{ color: '#fff' }}> mercado primário</strong>: na planta, em obras ou pronto novo, nunca usado.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando…</p>}

      {!loading && (
        <>
          {/* Simulações */}
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            📊 Minhas simulações {simulacoes.length > 0 ? `(${simulacoes.length})` : ''}
          </p>
          {simulacoes.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
              Nenhuma simulação ainda. <a href="/simulador" style={{ color: 'var(--primary)' }}>Descobrir meu perfil →</a>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {simulacoes.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                      {s.modalidade} · {formatBRL(s.parcelaPrice)}/mês
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                      Imóvel de {formatBRL(s.valorImovel)} · {s.prazoAnos} anos · {formatData(s.criadoEm)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <BotaoReenviar email={email} sim={s} />
                    <button onClick={() => removerSimulacao(s.id)} disabled={cancelando === s.id}
                      title="Remover"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {cancelando === s.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Favoritos */}
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            ❤️ Meus favoritos {favoritoIds.length > 0 ? `(${favoritoIds.length})` : ''}
          </p>
          {favoritoIds.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
              Nenhum favorito ainda. <a href="/imoveis" style={{ color: 'var(--primary)' }}>Ver imóveis →</a>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {favoritoIds.map(id => {
                const b = catalogo[id];
                return (
                  <a key={id} href={`/imoveis/${id}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', textDecoration: 'none' }}>
                    {b?.photo && <img src={b.photo} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b?.name || id}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                        {b ? [b.neighborhood, b.city].filter(Boolean).join(' · ') : ''}{b?.min_price && b.min_price >= 100 ? ` · ${formatBRL(b.min_price)}` : ''}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Imóveis vistos */}
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            👁️ Imóveis que você viu {vistosIds.length > 0 ? `(${vistosIds.length})` : ''}
          </p>
          {vistosIds.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
              Nenhum imóvel visto ainda. <a href="/imoveis" style={{ color: 'var(--primary)' }}>Ver imóveis →</a>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {vistosIds.map(id => {
                const b = catalogo[id];
                return (
                  <a key={id} href={`/imoveis/${id}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', textDecoration: 'none' }}>
                    {b?.photo && <img src={b.photo} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b?.name || id}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                        {b ? [b.neighborhood, b.city].filter(Boolean).join(' · ') : ''}{b?.min_price && b.min_price >= 100 ? ` · ${formatBRL(b.min_price)}` : ''}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Alertas */}
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            🔔 Alertas ativos {alertas.length > 0 ? `(${alertas.length})` : ''}
          </p>
          {alertas.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
              Nenhum alerta ativo. Ative um em <a href="/imoveis" style={{ color: 'var(--primary)' }}>Imóveis</a>, filtrando o que você procura.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {alertas.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{a.descricaoFiltros}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>desde {formatData(a.criadoEm)}</p>
                  </div>
                  <button
                    onClick={() => cancelarAlerta(a.id)}
                    disabled={cancelando === a.id}
                    style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {cancelando === a.id ? 'Cancelando…' : 'Cancelar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Contatos */}
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            💬 Contatos feitos {contatos.length > 0 ? `(${contatos.length})` : ''}
          </p>
          {contatos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Nenhum contato registrado ainda com este e-mail.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contatos.map(c => (
                <a key={c.id} href={`/imoveis/${c.imovelId}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', textDecoration: 'none' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{c.imovelName}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>{formatData(c.criadoEm)}</p>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ContaInner() {
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = checando

  const checar = useCallback(async () => {
    const res = await fetch('/api/conta/me');
    const data = await res.json().catch(() => ({ email: null }));
    setEmail(data.email);
  }, []);

  useEffect(() => { checar(); }, [checar]);

  async function sair() {
    await fetch('/api/conta/sair', { method: 'POST' });
    setEmail(null);
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 20px 40px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        {email === undefined && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando…</p>}
        {email === null && <LoginForm onEntrar={setEmail} />}
        {email && <Dashboard email={email} onSair={sair} />}
      </div>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <ContaInner />
    </Suspense>
  );
}
