'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Lead, LeadStatus } from '@/lib/leads-kv';

const STATUS_CFG: Record<LeadStatus, { label: string; cor: string; bg: string }> = {
  novo:        { label: 'Novo',             cor: '#2563eb', bg: 'rgba(37,99,235,.12)' },
  conversando: { label: 'Conversando',      cor: '#d97706', bg: 'rgba(217,119,6,.12)' },
  visita:      { label: 'Visita agendada',  cor: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
  fechado:     { label: 'Fechado',          cor: '#16a34a', bg: 'rgba(22,163,74,.12)' },
  perdido:     { label: 'Perdido',          cor: '#dc2626', bg: 'rgba(220,38,38,.12)' },
};
const STATUS_ORDER: LeadStatus[] = ['novo', 'conversando', 'visita', 'fechado', 'perdido'];

function formatBRL(v: number | null): string {
  if (!v) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Login ──────────────────────────────────────────────────────────────────
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
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔒 Painel de Leads</p>
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

// ─── Painel principal ───────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [authed, setAuthed]   = useState<boolean | null>(null); // null = checando
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState<LeadStatus | 'todos'>('todos');

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/leads');
    if (res.status === 401) { setAuthed(false); setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads || []);
    setAuthed(true);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function atualizarStatus(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l)); // otimista
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function salvarNota(id: string, nota: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, nota } : l));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota }),
    });
  }

  if (authed === null) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={carregar} />;
  }

  const leadsFiltrados = filtro === 'todos' ? leads : leads.filter(l => l.status === filtro);
  const contagem = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {} as Record<LeadStatus, number>);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Leads — FinancieCerto</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} registrado{leads.length !== 1 ? 's' : ''} automaticamente pelos cliques de WhatsApp
          </p>
        </div>
        <button onClick={carregar} style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Filtro por status */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button onClick={() => setFiltro('todos')} style={{
          padding: '7px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          border: `1.5px solid ${filtro === 'todos' ? 'var(--primary)' : 'var(--border)'}`,
          background: filtro === 'todos' ? 'var(--primary-light)' : 'var(--bg)',
          color: filtro === 'todos' ? 'var(--primary)' : 'var(--text-muted)',
        }}>Todos ({leads.length})</button>
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setFiltro(s)} style={{
            padding: '7px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            border: `1.5px solid ${filtro === s ? STATUS_CFG[s].cor : 'var(--border)'}`,
            background: filtro === s ? STATUS_CFG[s].bg : 'var(--bg)',
            color: filtro === s ? STATUS_CFG[s].cor : 'var(--text-muted)',
          }}>{STATUS_CFG[s].label} ({contagem[s] || 0})</button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando leads…</p>}

      {!loading && leadsFiltrados.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '14px', color: 'var(--text-muted)' }}>
          Nenhum lead {filtro !== 'todos' ? `com status "${STATUS_CFG[filtro].label}"` : 'ainda'}.
          <br />Assim que alguém clicar em &quot;Falar com consultor&quot; num imóvel, aparece aqui.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {leadsFiltrados.map(lead => (
          <div key={lead.id} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>{lead.imovelName}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                  📍 {[lead.bairro, lead.cidade].filter(Boolean).join(' · ')}
                  {lead.preco ? ` · ${formatBRL(lead.preco)}` : ''}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>{formatData(lead.criadoEm)}</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                {lead.imovelId !== 'simulacao-na-planta' && (
                  <a href={`/imoveis/${lead.imovelId}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Ver no site →
                  </a>
                )}
                {lead.oruloUrl && (
                  <a href={lead.oruloUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    {lead.imovelId === 'simulacao-na-planta' ? 'Ver simulação →' : 'Abrir na Orulo →'}
                  </a>
                )}
              </div>
            </div>

            {(lead.simulacao || lead.cenarioProposta || typeof lead.favoritosCount === 'number') && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lead.simulacao && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', background: 'rgba(37,99,235,.1)', borderRadius: '6px', padding: '3px 8px' }}>
                    📊 {lead.simulacao.modalidade}{lead.simulacao.faixa ? ` ${lead.simulacao.faixa}` : ''}
                    {lead.simulacao.renda ? ` · renda ${formatBRL(lead.simulacao.renda)}` : ''}
                    {lead.simulacao.comprometimento ? ` · ${lead.simulacao.comprometimento}% comprometido` : ''}
                  </span>
                )}
                {lead.cenarioProposta && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', background: 'rgba(124,58,237,.1)', borderRadius: '6px', padding: '3px 8px' }}>
                    📋 Cenário: ato {formatBRL(lead.cenarioProposta.ato)}
                    {lead.cenarioProposta.fgts > 0 ? ` · FGTS ${formatBRL(lead.cenarioProposta.fgts)}` : ''}
                    {lead.cenarioProposta.mensais > 0 ? ` · mensais ${formatBRL(lead.cenarioProposta.mensais)}` : ''}
                  </span>
                )}
                {typeof lead.favoritosCount === 'number' && lead.favoritosCount > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', background: 'rgba(220,38,38,.08)', borderRadius: '6px', padding: '3px 8px' }}>
                    ❤️ {lead.favoritosCount} favorito{lead.favoritosCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={lead.status}
                onChange={e => atualizarStatus(lead.id, e.target.value as LeadStatus)}
                style={{
                  padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  border: `1.5px solid ${STATUS_CFG[lead.status].cor}`, background: STATUS_CFG[lead.status].bg,
                  color: STATUS_CFG[lead.status].cor, fontFamily: 'inherit', outline: 'none',
                }}
              >
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
              </select>

              <input
                defaultValue={lead.nota}
                placeholder="Nota (opcional) — ex: ligou, não atendeu"
                onBlur={e => { if (e.target.value !== lead.nota) salvarNota(lead.id, e.target.value); }}
                style={{ flex: 1, minWidth: '220px', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
