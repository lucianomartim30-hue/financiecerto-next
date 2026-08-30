'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔗 Órulo</p>
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

function formatData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MENSAGENS_ERRO: Record<string, string> = {
  sem_codigo: 'A Órulo não devolveu um código de autorização. Tente de novo.',
  state_invalido: 'A autorização expirou ou foi feita em outra aba. Tente de novo.',
  credenciais_ausentes: 'ORULO_CLIENT_ID/SECRET não configurados no servidor.',
  troca_de_token_falhou: 'A Órulo recusou a troca do código pelo token. Tente de novo.',
  erro_inesperado: 'Erro inesperado ao conectar. Tente de novo.',
};

function PainelOrulo() {
  const params = useSearchParams();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ conectado: boolean; obtidoEm: string | null } | null>(null);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/admin/orulo-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [authed]);

  if (authed === null) {
    fetch('/api/leads').then(res => setAuthed(res.status !== 401)).catch(() => setAuthed(false));
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  const conectadoAgora = params.get('conectado') === '1';
  const erro = params.get('erro');

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔗 Conexão com a Órulo</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Autoriza o FinancieCerto a consultar, em tempo real, o texto das campanhas/promoções oficiais que as construtoras registram na Órulo — algo que sua API atual (sem esse login) não enxerga, só o booleano &quot;existe uma condição&quot;. Aparece na página de cada imóvel quando a construtora tiver uma campanha ativa lá.
      </p>

      {conectadoAgora && (
        <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: '700', marginBottom: '16px', padding: '10px 14px', background: 'rgba(22,163,74,.08)', borderRadius: '10px' }}>
          ✅ Conectado com sucesso!
        </p>
      )}
      {erro && (
        <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: '700', marginBottom: '16px', padding: '10px 14px', background: 'rgba(220,38,38,.08)', borderRadius: '10px' }}>
          ⚠️ {MENSAGENS_ERRO[erro] || 'Erro ao conectar.'}
        </p>
      )}

      <div style={{ padding: '18px', border: '1.5px solid var(--border)', borderRadius: '14px', background: 'var(--bg-card)' }}>
        {status === null ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verificando…</p>
        ) : status.conectado ? (
          <>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a' }}>✅ Conectado</p>
            {status.obtidoEm && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Autorizado em {formatData(status.obtidoEm)}</p>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '10px' }}>
              A Órulo não garante que esse acesso dure pra sempre — se parar de funcionar (a página do imóvel para de mostrar campanha oficial mesmo em prédio que tem uma), basta reconectar abaixo.
            </p>
          </>
        ) : (
          <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>Não conectado</p>
        )}

        <a
          href="/api/orulo/oauth/start"
          style={{ display: 'inline-block', marginTop: '14px', padding: '11px 20px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}
        >
          {status?.conectado ? '🔄 Reconectar com a Órulo' : '🔗 Conectar com a Órulo'}
        </a>
      </div>
    </div>
  );
}

export default function AdminOruloPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>}>
      <PainelOrulo />
    </Suspense>
  );
}
