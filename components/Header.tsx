'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>F</span>
          </div>
          <span style={{
            fontSize: '17px',
            fontWeight: '700',
            color: 'var(--text)',
            letterSpacing: '-0.3px',
          }}>
            Financie<span style={{ color: 'var(--primary)' }}>Certo</span>
          </span>
        </Link>

        {/* Navegação */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <NavLink href="/" active={pathname === '/'}>Início</NavLink>
          <NavLink href="/simulador" active={pathname === '/simulador'}>Simular</NavLink>
          <NavLink href="/imoveis" active={pathname === '/imoveis'}>Imóveis</NavLink>
        </nav>

        {/* CTA */}
        <Link href="/simulador" style={{ textDecoration: 'none' }}>
          <button style={{
            background: '#2563eb', color: '#ffffff', border: 'none',
            borderRadius: '10px', padding: '8px 18px', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer', display: 'inline-block',
          }}>
            Descobrir meu perfil
          </button>
        </Link>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: '6px 14px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: active ? '600' : '500',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      background: active ? 'var(--primary-light)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.15s',
    }}>
      {children}
    </Link>
  );
}
