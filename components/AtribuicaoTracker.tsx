'use client';

import { useEffect } from 'react';
import { capturarPrimeiraOrigem } from '@/lib/atribuicao';

/** Componente invisível: captura a origem da visita (first-touch) uma vez por sessão. */
export default function AtribuicaoTracker() {
  useEffect(() => {
    capturarPrimeiraOrigem();
  }, []);
  return null;
}
