'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/simulador', label: 'Simular',   icon: '🧮' },
  { href: '/imoveis',   label: 'Imóveis',   icon: '🏘️' },
  { href: '/guia',      label: 'Guia',      icon: '📘' },
  { href: '/glossario', label: 'Glossário', icon: '🔤' },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--header-h)',
        background: 'rgba(255,255,255,.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 200,
        boxShadow: '0 1px 0 0 var(--border)',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          gap: '16px',
        }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>
              🏠
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                Financie<span style={{ color: 'var(--primary)' }}>Certo</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '500', letterSpacing: '0.3px', marginTop: '2px' }}>
                MCMV · SBPE · 2026
              </div>
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="desktop-nav">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: active ? '700' : '500',
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
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

          {/* CTA + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <Link href="/simulador" className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
              Descobrir perfil
            </Link>
            {/* Hamburger — visível apenas no mobile */}
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

      {/* ── Mobile Drawer Overlay ──────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 300,
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, right: menuOpen ? 0 : '-100%',
        width: '72vw', maxWidth: '280px',
        height: '100vh',
        background: 'var(--bg-card)',
        zIndex: 400,
        transition: 'right 0.25s cubic-bezier(.4,0,.2,1)',
        boxShadow: '-8px 0 32px rgba(0,0,0,.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              background: 'none', border: 'none', fontSize: '20px',
              cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {[{ href: '/', label: 'Início', icon: '🏠' }, ...NAV_LINKS].map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
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
                  fontWeight: active ? '700' : '500',
                  fontSize: '15px',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
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

      {/* Estilos responsive inline */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hamburger-btn { display: none !important; }
        }
        /* Empurra o conteúdo para baixo do header fixo */
        main { padding-top: var(--header-h); }
      `}</style>
    </>
  );
}