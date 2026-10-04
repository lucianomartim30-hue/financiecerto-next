/**
 * Resumo do imóvel renderizado NO SERVIDOR (HTML inicial).
 *
 * ImovelDetailClient busca os dados completos no navegador, então o HTML que o
 * Google recebe antes de executar JavaScript só tinha menu + "Carregando imóvel..."
 * (341 caracteres) — leitura típica de "soft 404" no Search Console. Aqui o HTML já
 * traz h1, texto descritivo, dados-chave, tipologias e links internos pra imóveis
 * relacionados; o client mostra este bloco enquanto carrega e o troca pela ficha
 * completa quando os dados chegam.
 */
import Link from 'next/link';
import type { CatalogEntry } from '@/lib/orulo-kv';
import { temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { getStatusCfg } from '@/lib/status';
import { construtoraToSlug, nomePublicoConstrutora } from '@/lib/construtora-nomes';
import { neighborhoodToSlug, slugToLocation } from '@/lib/locations';
import { catalogoPublicoParaBairros, bairroSlugsValidos } from '@/lib/bairros-validos';

function brl(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function num(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function faixa(min: number | null | undefined, max: number | null | undefined, unidade: string, plural = unidade): string | null {
  if (min == null) return null;
  if (max != null && max !== min) return `${num(min)} a ${num(max)} ${plural}`;
  return `${num(min)} ${min === 1 ? unidade : plural}`;
}

function dataEntrega(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function precoDe(b: CatalogEntry): number | null {
  return temPrecoReal(b) ? b.min_price : null;
}

async function relacionados(b: CatalogEntry): Promise<{
  doBairro: CatalogEntry[];
  daConstrutora: CatalogEntry[];
  bairroSlug: string | null;
}> {
  try {
    const publico = await catalogoPublicoParaBairros();
    const slugConstrutora = construtoraToSlug(b.developer);
    const ordenar = (lista: CatalogEntry[]) =>
      lista
        .filter(x => x.id !== b.id)
        .sort((x, y) => (precoDe(x) ?? Number.MAX_SAFE_INTEGER) - (precoDe(y) ?? Number.MAX_SAFE_INTEGER))
        .slice(0, 6);
    const doBairro = ordenar(publico.filter(x => x.neighborhood === b.neighborhood && x.city === b.city));
    const daConstrutora = slugConstrutora
      ? ordenar(publico.filter(x => construtoraToSlug(x.developer) === slugConstrutora))
      : [];

    let bairroSlug: string | null = null;
    if (b.neighborhood && b.state) {
      const slug = neighborhoodToSlug(b.neighborhood, b.state);
      if (slugToLocation(slug).city && (await bairroSlugsValidos()).has(slug)) bairroSlug = slug;
    }
    return { doBairro, daConstrutora, bairroSlug };
  } catch {
    return { doBairro: [], daConstrutora: [], bairroSlug: null };
  }
}

const caixa: React.CSSProperties = {
  background: 'var(--surface, #fff)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '18px 20px',
};

function ListaLinks({ itens }: { itens: CatalogEntry[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
      {itens.map(i => {
        const p = precoDe(i);
        return (
          <li key={i.id}>
            <Link href={`/imoveis/${i.id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {i.name}
            </Link>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {' — '}{[i.neighborhood, i.city].filter(Boolean).join(', ')}{p ? ` · a partir de ${brl(p)}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function ImovelResumoSEO({ b }: { b: CatalogEntry }) {
  const { doBairro, daConstrutora, bairroSlug } = await relacionados(b);
  const construtora = nomePublicoConstrutora(b.developer);
  const slugConstrutora = construtoraToSlug(b.developer);
  const preco = precoDe(b);
  const status = getStatusCfg(b.status, b.min_price).label;
  const entrega = dataEntrega(b.delivery_date);
  const quartos = faixa(b.bedrooms_min, b.bedrooms_max, 'quarto', 'quartos');
  const area = faixa(b.area_min, b.area_max, 'm²', 'm²');
  const banheiros = faixa(b.bathrooms_min, b.bathrooms_max, 'banheiro', 'banheiros');
  const vagas = faixa(b.vagas_min, b.vagas_max, 'vaga', 'vagas');
  const local = [b.neighborhood, b.city].filter(Boolean).join(', ');
  const naoResidencial = b.finality_norm === 'comercial';
  const tipologias = (b.typology_ranges ?? []).filter(t => t.type);

  const fatos: Array<[string, string]> = [];
  if (construtora) fatos.push(['Construtora', construtora]);
  if (local) fatos.push(['Localização', `${local}${b.state ? ` (${b.state})` : ''}`]);
  if (b.address_full) fatos.push(['Endereço', b.address_full]);
  if (status) fatos.push(['Estágio', status]);
  if (entrega) fatos.push(['Previsão de entrega', entrega]);
  if (quartos) fatos.push(['Dormitórios', quartos]);
  if (area) fatos.push(['Metragem', area]);
  if (banheiros) fatos.push(['Banheiros', banheiros]);
  if (vagas) fatos.push(['Vagas', vagas]);
  if (b.stock != null && b.stock > 0) fatos.push(['Unidades disponíveis', String(b.stock)]);
  if (preco) fatos.push(['Preço', `a partir de ${brl(preco)}${b.bedrooms_max != null && b.bedrooms_max !== b.bedrooms_min ? ' (unidade menor)' : ''}`]);

  return (
    <article style={{ maxWidth: '1120px', margin: '0 auto', padding: '28px 18px 8px' }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: '12px', marginBottom: '16px', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
        {' › '}
        <Link href="/imoveis" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Imóveis</Link>
        {bairroSlug && (
          <>
            {' › '}
            <Link href={`/bairro/${bairroSlug}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{b.neighborhood}</Link>
          </>
        )}
        {' › '}
        <span>{b.name}</span>
      </nav>

      <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.15 }}>
        {b.name}
      </h1>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 18px', fontSize: '15px' }}>
        {[construtora && `Construtora ${construtora}`, local].filter(Boolean).join(' · ')}
      </p>

      <p style={{ color: 'var(--text)', lineHeight: 1.65, margin: '0 0 18px', maxWidth: '760px' }}>
        {`${b.name} é um empreendimento${construtora ? ` da ${construtora}` : ''}${local ? ` em ${local}${b.state ? `, ${b.state}` : ''}` : ''}.`}
        {quartos || area ? ` Reúne unidades${quartos ? ` de ${quartos}` : ''}${area ? `${quartos ? ',' : ''} com ${area}` : ''}.` : ''}
        {preco ? ` Os preços partem de ${brl(preco)}.` : ' O preço ainda está sob consulta.'}
        {status ? ` Estágio atual: ${status.toLowerCase()}${entrega ? `, com entrega prevista para ${entrega}` : ''}.` : ''}
        {naoResidencial ? ' Unidade não residencial (NR): o financiamento é feito apenas pela modalidade SFI, sem MCMV, FGTS ou SBPE.' : ''}
        {' Simule o financiamento com a sua renda e veja se você tem perfil para comprar este imóvel.'}
      </p>

      {fatos.length > 0 && (
        <section aria-label="Dados do empreendimento" style={{ ...caixa, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>Dados do empreendimento</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 24px', margin: 0 }}>
            {fatos.map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</dt>
                <dd style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {tipologias.length > 0 && (
        <section aria-label="Tipologias" style={{ ...caixa, marginBottom: '16px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>Tipologias disponíveis</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '6px 8px' }}>Tipo</th>
                <th style={{ padding: '6px 8px' }}>Dormitórios</th>
                <th style={{ padding: '6px 8px' }}>Área</th>
                <th style={{ padding: '6px 8px' }}>A partir de</th>
              </tr>
            </thead>
            <tbody>
              {tipologias.map(t => {
                const p = t.price_min && t.price_min >= 1000 ? t.price_min : null;
                return (
                  <tr key={t.type} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>{t.type}</td>
                    <td style={{ padding: '8px' }}>{faixa(t.bedrooms_min, t.bedrooms_max, 'quarto', 'quartos') ?? '—'}</td>
                    <td style={{ padding: '8px' }}>{faixa(t.area_min, t.area_max, 'm²', 'm²') ?? '—'}</td>
                    <td style={{ padding: '8px' }}>{p ? brl(p) : 'Sob consulta'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section aria-label="Próximos passos" style={{ ...caixa, marginBottom: '16px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>Simule e compare</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Descubra a parcela, a entrada e a modalidade de financiamento (MCMV, SBPE ou SFI) compatíveis com a sua renda antes de falar com a construtora.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', fontWeight: 600 }}>
          <Link href="/simulador" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Simular financiamento</Link>
          <Link href="/simulador/na-planta" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Simular compra na planta</Link>
          {slugConstrutora && (
            <Link href={`/construtoras/${slugConstrutora}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Mais imóveis da {construtora}
            </Link>
          )}
          {bairroSlug && (
            <Link href={`/bairro/${bairroSlug}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Imóveis em {b.neighborhood}
            </Link>
          )}
        </div>
      </section>

      {doBairro.length > 0 && (
        <section aria-label="Outros imóveis na região" style={{ ...caixa, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>Outros imóveis em {b.neighborhood}</h2>
          <ListaLinks itens={doBairro} />
        </section>
      )}

      {daConstrutora.length > 0 && (
        <section aria-label="Outros imóveis da construtora" style={{ ...caixa, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>Mais empreendimentos da {construtora}</h2>
          <ListaLinks itens={daConstrutora} />
        </section>
      )}
    </article>
  );
}
