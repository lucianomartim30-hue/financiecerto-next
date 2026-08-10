'use client';

import { useEffect, useState } from 'react';
import { isFavorito, toggleFavorito, onFavoritosChange } from '@/lib/favoritos';

interface Props {
  id: string;
  nome?: string;
  size?: 'sm' | 'lg';
  style?: React.CSSProperties;
}

/**
 * Botão de favoritar reutilizável — cards de listagem e página de detalhe.
 * `stopPropagation` é essencial: em cards, o clique no coração não pode
 * disparar a navegação do card inteiro.
 */
export default function FavoritoButton({ id, nome, size = 'sm', style }: Props) {
  const [fav, setFav] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFav(isFavorito(id));
    return onFavoritosChange(() => setFav(isFavorito(id)));
  }, [id]);

  // Evita flash/hydration mismatch: nada é renderizado até saber o estado real.
  if (!mounted) return <span style={{ width: size === 'lg' ? '40px' : '30px', height: size === 'lg' ? '40px' : '30px', display: 'inline-block', ...style }} />;

  const dim = size === 'lg' ? 40 : 30;
  const fontSize = size === 'lg' ? 20 : 15;

  return (
    <button
      type="button"
      aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const novoEstado = toggleFavorito(id);
        setFav(novoEstado);
        import('@/lib/gtag').then(m => m.trackFavoritar({ imovel: nome, favoritado: novoEstado }));
      }}
      style={{
        width: `${dim}px`, height: `${dim}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: fav ? 'rgba(220,38,38,.12)' : 'rgba(15,23,42,.45)',
        backdropFilter: 'blur(4px)',
        fontSize: `${fontSize}px`,
        transition: 'transform 0.15s, background 0.15s',
        flexShrink: 0,
        ...style,
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.85)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {fav ? '❤️' : '🤍'}
    </button>
  );
}
