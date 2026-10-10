'use client';

import { useEffect } from 'react';

/**
 * Componente invisível do /admin: pede ao servidor pra marcar este navegador
 * como "acesso interno" (cookie fc_interno) quando o dono está logado. Com a
 * marca, o script do GA em app/layout.tsx para de enviar dados ao Analytics.
 */
export default function MarcaAcessoInterno() {
  useEffect(() => {
    fetch('/api/admin-auth').catch(() => {});
  }, []);
  return null;
}
