'use client';

import { useRouter, usePathname } from 'next/navigation';

/**
 * Botão de voltar dentro do próprio Header (não flutuante) — presente em
 * qualquer página exceto a Home (que não tem "anterior"; a logo já cumpre
 * esse papel ali). Fica fixo na barra do cabeçalho pra nunca sobrepor
 * conteúdo de página, como a barra de filtros de /imoveis. Usa o histórico
 * do navegador (router.back()), não um destino fixo — volta pra onde a
 * pessoa realmente estava, filtros aplicados incluídos.
 */
export default function BotaoVoltar() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Voltar para a página anterior"
      title="Voltar"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: '1.5px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-muted)',
        fontSize: '17px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      ←
    </button>
  );
}
