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
  // Restringe a quais tipologias essa planta se aplica (ver "Preenche o botão
  // Ver planta..." em app/api/orulo/[id]/route.ts) — sem isso, um
  // empreendimento com tipologias bem diferentes (ex: studio vs 2 dorms)
  // preenchia TODAS com a mesma planta, mostrando a planta errada pra quem
  // via a tipologia menor (bug real, achado 2026-09-01 no W Stay Perdizes).
  // Omitido = aplica a qualquer tipologia sem blueprint (comportamento
  // antigo, mantido pro caso de um empreendimento com uma tipologia só).
  areaMin?: number;
  areaMax?: number;
}

// Chave = id do imóvel na Orulo. Aplica à(s) tipologia(s) sem blueprint (na
// faixa de área informada) e também entra na lista geral "Plantas
// disponíveis" do empreendimento.
const PLANTAS_MANUAIS: Record<string, PlantaManual[]> = {
  '2109': [ // Beyond Jardins — planta enviada pelo corretor 2026-08-18
    { url: '/plantas-manuais/2109-tipo-4-suites.jpg', name: 'Planta — Tipo 4 suítes' },
  ],
  '81515': [ // W Stay Perdizes — planta do apto 43-46m² (1 dorm + sala de TV), book da WDS, 2026-09-01
    { url: '/plantas-manuais/81515-46m2-1dorm-sala-tv.png', name: 'Planta — Apto 43 a 46m² (1 dorm + sala de TV)', areaMin: 40, areaMax: 50 },
  ],
};

export function getPlantasManuais(imovelId: string): PlantaManual[] {
  return PLANTAS_MANUAIS[imovelId] ?? [];
}
