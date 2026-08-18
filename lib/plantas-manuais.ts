/**
 * lib/plantas-manuais.ts
 * Curadoria manual de plantas baixas por empreendimento — a Orulo às vezes
 * não tem a planta cadastrada pro imóvel (comum em altíssimo padrão, onde a
 * incorporadora só libera sob consulta), mesmo quando o corretor tem a
 * imagem em mãos. Sem isso, o botão "Ver planta" simplesmente não aparece
 * (ver app/imoveis/[id]/ImovelDetailClient.tsx, SecaoTipologias).
 *
 * Imagem física fica em public/plantas-manuais/ — sem custo de storage
 * externo, funciona bem pro volume baixo esperado (casos pontuais, não o
 * catálogo inteiro).
 */

export interface PlantaManual {
  url: string;
  name: string;
}

// Chave = id do imóvel na Orulo. Aplica à(s) tipologia(s) sem blueprint e
// também entra na lista geral "Plantas disponíveis" do empreendimento.
const PLANTAS_MANUAIS: Record<string, PlantaManual[]> = {
  '2109': [ // Beyond Jardins — planta enviada pelo corretor 2026-08-18
    { url: '/plantas-manuais/2109-tipo-4-suites.jpg', name: 'Planta — Tipo 4 suítes' },
  ],
};

export function getPlantasManuais(imovelId: string): PlantaManual[] {
  return PLANTAS_MANUAIS[imovelId] ?? [];
}
