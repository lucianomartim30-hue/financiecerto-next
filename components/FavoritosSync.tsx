'use client';

import { useEffect } from 'react';
import { mesclarFavoritosDoServidor } from '@/lib/favoritos';

/**
 * Componente invisível: busca os favoritos já salvos no servidor pra esse
 * dono (conta logada ou aparelho) e mescla no localStorage. Sem isso, os
 * favoritos só reapareciam dentro de /conta — em qualquer outro lugar do
 * site (botão de coração, página /favoritos) o localStorage vazio de um
 * aparelho novo fazia tudo parecer nunca favoritado, mesmo já existindo no
 * servidor.
 */
export default function FavoritosSync() {
  useEffect(() => {
    fetch('/api/favoritos')
      .then(r => r.json())
      .then(data => mesclarFavoritosDoServidor(data?.ids || []))
      .catch(() => {});
  }, []);
  return null;
}
