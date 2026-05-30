'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';

// ── Links simples da nav ───────────────────────────────────────────────────────
const NAV_SIMPLE = [
  { href: '/',          label: 'Início',    icon: '🏠' },
  { href: '/imoveis',   label: 'Imóveis',   icon: '🏘️' },
  { href: '/guia',      label: 'Guia',      icon: '📘' },
  { href: '/glossario', label: 'Glossário', icon: '🔤' },
  { href: '/sobre',     label: 'Sobre nós', icon: 'ℹ️' },
  { href: '/contato',   label: 'Contato',   icon: '✉️' },
];

// ── Opções do dropdown "Simular" ──────────────────────────────────────────────
const SIM_OPTIONS = [
  {
    href:    '/simulador/na-planta',
    icon:    '📐',
    label:   'Na Planta',
    desc:    'Juros evolutivos e SIOPI — imóvel em construção',
    highlight: true,
  },
  {
    href:    '/simulador',
    icon:    '🏠',
    label:   'Pronto / Novo',
    desc:    'MCMV, SBPE-SFH e financiamento padrão',
    highlight: false,
  },
];

export default function Header() {
  const pathname  = usePathname();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [simOpen,  setSimOpen]      = useState(false);
  const [simMobile, setSimMobile]   = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSimActive = pathname.startsWith('/simulador');

  // ── Hover helpers para o dropdown desktop ─────────────────────────────────
  function openSim()  {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setSimOpen(true);
  }
  function closeSim() {
    hoverTimeout.current = setTimeout(() => setSimOpen(false), 120);
  }

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--header-h)',
        background: 'rgba(255,255,255,.97)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 800,
        boxShadow: '0 1px 8px rgba(0,0,0,.06)',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          gap: '16px',
        }}>

          {/* ── Logo ───────────────────────────────────────────────────────── */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>🏠</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                Financie<span style={{ color: 'var(--primary)' }}>Certo</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '500', letterSpacing: '0.3px', marginTop: '2px' }}>
                MCMV · SBPE · 2026
              </div>
            </div>
          </Link>

          {/* ── Navegação Desktop ──────────────────────────────────────────── */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="desktop-nav">

            {/* Dropdown "Simular" */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={openSim}
              onMouseLeave={closeSim}
            >
              <button
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: isSimActive ? '700' : '600',
                  color: isSimActive ? 'var(--primary)' : 'var(--text)',
                  background: isSimActive ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                Simular
                <span style={{
                  fontSize: '10px',
                  display: 'inline-block',
                  transform: simOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s',
                  opacity: 0.55,
                }}>▼</span>
              </button>

              {/* Painel dropdown */}
              {simOpen && (
                <div
                  onMouseEnter={openSim}
                  onMouseLeave={closeSim}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '320px',
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,.13)',
                    overflow: 'hidden',
                    zIndex: 900,
                    animation: 'dropFade 0.15s ease',
                  }}
                >
                  <div style={{ padding: '8px' }}>
                    {SIM_OPTIONS.map(opt => (
                      <Link
                        key={opt.href}
                        href={opt.href}
                        onClick={() => setSimOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          background: opt.highlight ? 'linear-gradient(135deg, rgba(37,99,235,.07), rgba(99,102,241,.05))' : 'transparent',
                          border: opt.highlight ? '1px solid rgba(37,99,235,.15)' : '1px solid transparent',
                          marginBottom: opt.highlight ? '6px' : '0',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{
                          fontSize: '24px',
                          width: '36px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: opt.highlight ? 'rgba(37,99,235,.1)' : 'var(--bg)',
                          borderRadius: '8px',
                          flexShrink: 0,
                        }}>{opt.icon}</span>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: opt.highlight ? 'var(--primary)' : 'var(--text)',
                            marginBottom: '2px',
                          }}>
                            {opt.label}
                            {opt.highlight && (
                              <span style={{
                                marginLeft: '7px',
                                fontSize: '9px',
                                fontWeight: '800',
                                background: 'var(--primary)',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: '99px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                verticalAlign: 'middle',
                              }}>+ acessado</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.4 }}>{opt.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Links simples */}
            {NAV_SIMPLE.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: active ? '700' : '600',
                    color: active ? 'var(--primary)' : 'var(--text)',
                    background: active ? 'var(--primary-light)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ── CTA + Hamburger ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <Link href="/simulador" className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
              Descobrir perfil
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="hamburger-btn"
              style={{
                display: 'none',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '5px',
                width: '40px', height: '40px',
                background: 'transparent',
                border: '1.5px solid var(--border)',
                borderRadius: '9px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span style={{ display: 'block', width: '18px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
              <span style={{ display: 'block', width: '18px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
              <span style={{ display: 'block', width: '14px', height: '2px', background: 'var(--text)', borderRadius: '2px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Overlay ─────────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 1001,
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, right: menuOpen ? 0 : '-100%',
        width: '72vw', maxWidth: '280px',
        height: '100vh',
        background: 'var(--bg-card)',
        zIndex: 1002,
        transition: 'right 0.25s cubic-bezier(.4,0,.2,1)',
        boxShadow: '-8px 0 32px rgba(0,0,0,.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', lineHeight: 1 }}
          >✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>

          {/* Início */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '13px 20px',
              background: pathname === '/' ? 'var(--primary-light)' : 'transparent',
              color: pathname === '/' ? 'var(--primary)' : 'var(--text)',
              fontWeight: pathname === '/' ? '700' : '600',
              fontSize: '15px', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>🏠</span>
            Início
          </Link>

          {/* Simular — grupo expandível */}
          <div>
            <button
              onClick={() => setSimMobile(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '13px 20px',
                background: isSimActive ? 'var(--primary-light)' : 'transparent',
                color: isSimActive ? 'var(--primary)' : 'var(--text)',
                fontWeight: isSimActive ? '700' : '600',
                fontSize: '15px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>🧮</span>
                Simular
              </span>
              <span style={{
                fontSize: '11px', opacity: 0.5,
                transform: simMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.18s',
              }}>▼</span>
            </button>

            {simMobile && (
              <div style={{ background: 'rgba(37,99,235,.04)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {SIM_OPTIONS.map(opt => (
                  <Link
                    key={opt.href}
                    href={opt.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '13px 20px 13px 32px',
                      color: opt.highlight ? 'var(--primary)' : 'var(--text)',
                      fontWeight: opt.highlight ? '700' : '600',
                      fontSize: '14px', textDecoration: 'none',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                    <span>
                      {opt.label}
                      {opt.highlight && <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--primary)', color: '#fff', padding: '1px 5px', borderRadius: '99px' }}>+ acessado</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Links simples */}
          {NAV_SIMPLE.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 20px',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text)',
                  fontWeight: active ? '700' : '600',
                  fontSize: '15px', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 20px' }} />
          <Link
            href="/simulador"
            onClick={() => setMenuOpen(false)}
            className="btn-primary"
            style={{ display: 'flex', margin: '12px 20px', textDecoration: 'none' }}
          >
            Descobrir meu perfil →
          </Link>
        </nav>
      </div>

      <style>{`
        @keyframes dropFade {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
        }
        main { padding-top: var(--header-h); }
        .desktop-nav a:hover, .desktop-nav button:hover {
          background: var(--primary-light) !important;
          color: var(--primary) !important;
        }
      `}</style>
    </>
  );
}
