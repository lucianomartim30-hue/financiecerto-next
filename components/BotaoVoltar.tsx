'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { instalarRastreioDeHistorico, podeAvancar, EVENTO_NAV } from '@/lib/navegacao-historico';

const estiloSeta = (desativado: boolean) => ({
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
  cursor: desativado ? 'default' : 'pointer',
  opacity: desativado ? 0.35 : 1,
  flexShrink: 0,
  transition: 'background 0.15s, color 0.15s, opacity 0.15s',
} as const);

/**
 * Setas de voltar (←) e avançar (→) dentro do próprio Header (não flutuantes) —
 * presentes em qualquer página exceto a Home no caso do "voltar" (a Home não
 * tem "anterior"; a logo já cumpre esse papel ali). Ficam fixas na barra do
 * cabeçalho pra nunca sobrepor conteúdo de página, como a barra de filtros de
 * /imoveis. Usam o histórico do navegador (router.back()/forward()), não um
 * destino fixo — levam pra onde a pessoa realmente estava, com filtros e
 * simulações preenchidos (ver lib/persistir-estado.ts). O "avançar" só fica
 * ativo depois que a pessoa voltou alguma página — antes disso não há pra onde ir.
 */
export default function BotaoVoltar() {
  const router = useRouter();
  const pathname = usePathname();
  const [avancar, setAvancar] = useState(false);
  // No servidor o pathname não chega como "/" nem na Home (o HTML sai sempre com as
  // duas setas). Se a 1ª renderização no navegador já escondesse o "voltar" na Home,
  // não bateria com o HTML do servidor: o React acusava erro de hidratação (#418) e
  // refazia a página inteira no cliente. Por isso a regra da Home só vale depois de montar.
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    instalarRastreioDeHistorico();
    const atualizar = () => setAvancar(podeAvancar());
    atualizar();
    window.addEventListener(EVENTO_NAV, atualizar);
    return () => window.removeEventListener(EVENTO_NAV, atualizar);
  }, []);

  // Rota mudou por navegação normal (push) → não há mais "à frente".
  useEffect(() => { setAvancar(podeAvancar()); }, [pathname]);

  const naHome = montado && pathname === '/';
  // Na Home só aparece o avançar (e só quando existe); nas demais, os dois.
  if (naHome && !avancar) return null;

  return (
    <>
      {!naHome && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar para a página anterior"
          title="Voltar"
          style={estiloSeta(false)}
        >
          ←
        </button>
      )}
      <button
        type="button"
        onClick={() => { if (avancar) router.forward(); }}
        disabled={!avancar}
        aria-label="Avançar para a página seguinte"
        title={avancar ? 'Avançar' : 'Não há página à frente'}
        style={estiloSeta(!avancar)}
      >
        →
      </button>
    </>
  );
}
