// app/aprenda/layout.tsx
//
// O schema (CollectionPage + BreadcrumbList) de /aprenda morava aqui, mas
// este layout envolve TODO artigo individual (/aprenda/[slug]) também — o
// CollectionPage (que descreve a lista de artigos) e o breadcrumb de 2 níveis
// apareciam duplicados em cada artigo, empilhados com o schema próprio dele
// (BreadcrumbList de 3 níveis + Article/FAQPage). Movido para
// app/aprenda/page.tsx, que só renderiza na rota exata /aprenda
// (auditoria 2026-09).

export default function AprendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
