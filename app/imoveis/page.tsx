import ImoveisClientPage from './ImoveisClientPage';
import { ListaHubsSEO } from '@/components/ListaImoveisSEO';
import { bairrosMaisImoveis, construtorasMaisImoveis } from '@/lib/imoveis-listagem-seo';

// A vitrine é client-side: o HTML inicial chegava ao Google com ~350 caracteres e
// nenhum link pra bairros, construtoras ou imóveis. Os links abaixo vão no HTML
// do servidor e dão caminho de rastreamento pro resto do catálogo.
export const revalidate = 1800;

export default async function ImoveisPage() {
  const [bairros, construtoras] = await Promise.all([bairrosMaisImoveis(), construtorasMaisImoveis()]);
  return (
    <>
      <ImoveisClientPage />
      <ListaHubsSEO
        titulo="Imóveis à venda por bairro"
        intro="Explore os bairros com mais empreendimentos à venda. Em cada um você vê os imóveis, os valores e simula o financiamento."
        links={bairros}
      />
      <ListaHubsSEO
        titulo="Imóveis por construtora"
        intro="Veja os empreendimentos das construtoras e incorporadoras com mais lançamentos no catálogo."
        links={construtoras}
      />
    </>
  );
}
