'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RegistroAnonimo } from '@/lib/rastreio-kv';

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
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>👣 Rastreio</p>
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

function tempoAtras(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

function Cartao({ r }: { r: RegistroAnonimo }) {
  return (
    <div style={{ padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
        <p style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.id.slice(0, 8)}…</p>
        <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>última visita {tempoAtras(r.ultimaVisita)}</p>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
        {r.visitouSimulador && (
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: 'rgba(37,99,235,.1)', color: 'var(--primary)' }}>🧮 simulou</span>
        )}
        {r.imoveisVistos.length > 0 && (
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: 'rgba(22,163,74,.1)', color: '#16a34a' }}>🏠 viu {r.imoveisVistos.length} imóve{r.imoveisVistos.length === 1 ? 'l' : 'is'}</span>
        )}
        {r.visitouListagemImoveis && r.imoveisVistos.length === 0 && (
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: 'rgba(107,114,128,.12)', color: 'var(--text-muted)' }}>📋 só listagem</span>
        )}
      </div>
      {r.imoveisVistos.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {r.imoveisVistos.map(id => (
            <a key={id} href={`/imoveis/${id}`} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px' }}>
              #{id} ↗
            </a>
          ))}
        </div>
      )}
      <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '8px' }}>primeira visita {tempoAtras(r.primeiraVisita)} · {r.totalEventos} evento{r.totalEventos === 1 ? '' : 's'}</p>
    </div>
  );
}

function Secao({ titulo, descricao, registros }: { titulo: string; descricao: string; registros: RegistroAnonimo[] }) {
  if (registros.length === 0) return null;
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>{titulo} <span style={{ color: 'var(--text-faint)', fontWeight: '600' }}>({registros.length})</span></p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{descricao}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {registros.map(r => <Cartao key={r.id} r={r} />)}
      </div>
    </div>
  );
}

export default function AdminRastreioPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<{
    total: number;
    altaIntencao: RegistroAnonimo[];
    potenciais: RegistroAnonimo[];
    interessados: RegistroAnonimo[];
    soListagem: RegistroAnonimo[];
  } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/admin/rastreio');
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setErro('Erro ao carregar.'); return; }
      setDados(await res.json());
    } catch {
      setErro('Erro ao carregar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) carregar(); }, [authed, carregar]);

  if (authed === null) {
    fetch('/api/leads').then(res => setAuthed(res.status !== 401)).catch(() => setAuthed(false));
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>👣 Rastreio de visitantes</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Quem navegou no site nos últimos 60 dias sem nunca ter clicado no WhatsApp ou preenchido um formulário — não aparece em /admin/leads porque ainda não é um lead formal, mas o comportamento já indica intenção. Identificado só por um id de navegador (fc_vid), sem nome nem contato.
      </p>

      {loading && !dados && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Carregando…</p>}
      {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{erro}</p>}

      {dados && dados.total === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum visitante anônimo registrado ainda.</p>
      )}

      {dados && (
        <>
          <Secao
            titulo="🔥 Alta intenção"
            descricao="Simulou financiamento e já abriu página de imóvel — o perfil mais quente que ainda não converteu."
            registros={dados.altaIntencao}
          />
          <Secao
            titulo="🧮 Simulou mas não viu nenhum imóvel"
            descricao="Calculou o financiamento, mas ainda não abriu nenhuma página de imóvel específico — potencial lead que pode não ter achado o que procurava na vitrine."
            registros={dados.potenciais}
          />
          <Secao
            titulo="🏠 Viu imóveis mas não simulou"
            descricao="Interessado em imóveis específicos, mas ainda não calculou se cabe no bolso."
            registros={dados.interessados}
          />
          <Secao
            titulo="📋 Só passou pela listagem"
            descricao="Abriu a vitrine de imóveis mas não entrou em nenhum card nem simulou — sinal mais fraco."
            registros={dados.soListagem}
          />
        </>
      )}
    </div>
  );
}
