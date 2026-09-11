#!/usr/bin/env node
/**
 * update-tr.js
 *
 * Busca os últimos 36 meses de TR na API do Banco Central (Série 226)
 * e atualiza o array TR_HISTORICO_36M em lib/calculos.ts.
 *
 * A série 226 do BCB é publicada diariamente (não um valor por mês) — pra
 * cada dia normalmente saem DUAS entradas com a mesma data inicial: uma com
 * `dataFim` no último dia do MESMO mês (TR acumulada só daquele mês corrido)
 * e outra com `dataFim` ~30 dias à frente (uso em acúmulo diário de contrato).
 * O valor "de cada mês" historicamente usado aqui é o da 2ª entrada do dia 1º
 * útil do mês (a de janela ~30 dias) — por isso o filtro abaixo descarta a
 * entrada cujo dataFim cai no mesmo mês da data.
 *
 * Desde 2026-09 o endpoint `ultimos/N` passou a limitar N a 20, então este
 * script usa o endpoint por intervalo de datas (`dataInicial`/`dataFinal`),
 * que não tem esse teto.
 *
 * Uso:
 *   node scripts/update-tr.js           # atualiza o arquivo
 *   node scripts/update-tr.js --dry-run  # mostra o que seria feito, sem gravar
 */

'use strict';

const fs    = require('fs');
const https = require('https');
const path  = require('path');

// ─── Configuração ─────────────────────────────────────────────────────────────
const CALCULOS_PATH = path.join(__dirname, '..', 'lib', 'calculos.ts');
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DRY_RUN  = process.argv.includes('--dry-run');

function bcbUrl(dataInicial, dataFinal) {
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'financiecerto-update-tr/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => reject(new Error(`BCB retornou HTTP ${res.statusCode}: ${raw}`)));
        return;
      }
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try   { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`JSON inválido: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function toDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "01/06/2023" → "Jun/23" */
function toLabel(dataStr) {
  const [, mm, yyyy] = dataStr.split('/');
  return `${MESES_PT[parseInt(mm, 10) - 1]}/${yyyy.slice(2)}`;
}

/** "01/06/2023" → "Jun/2023" (para o comentário de cabeçalho) */
function toMesAno(dataStr) {
  const [, mm, yyyy] = dataStr.split('/');
  return `${MESES_PT[parseInt(mm, 10) - 1]}/${yyyy}`;
}

function mesDe(dataStr) {
  return dataStr.split('/')[1];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Janela generosa (38 meses) pra garantir que sobrem pelo menos 36 meses
  // completos mesmo com feriados/fins de semana deslocando o dia 1º útil.
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 38, 1);
  const dataInicial = toDDMMYYYY(inicio);
  const dataFinal   = toDDMMYYYY(hoje);
  const url = bcbUrl(dataInicial, dataFinal);

  console.log(`🔍 Buscando TR no BCB de ${dataInicial} até ${dataFinal}...`);
  console.log(`   URL: ${url}\n`);

  const dados = await fetchJSON(url);

  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error('BCB retornou resposta vazia ou inválida');
  }

  console.log(`✅ Recebidos ${dados.length} registros diários\n`);

  // Pra cada dia 1º (data começando em "01/"), a série traz duas entradas:
  // a de janela ~30 dias (dataFim no mês seguinte) é a que usamos como "TR
  // do mês" — descarta a de dataFim no mesmo mês (TR acumulada só do mês).
  const porMes = new Map(); // "MM/YYYY" → {data, valor}
  for (const { data, dataFim, valor } of dados) {
    if (!data.startsWith('01/')) continue;
    if (mesDe(dataFim) === mesDe(data)) continue; // descarta a janela "mesmo mês"
    const chave = data.slice(3); // "MM/YYYY"
    porMes.set(chave, { data, valor: parseFloat(valor) });
  }

  const meses = [...porMes.entries()]
    .sort(([a], [b]) => {
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      return ya - yb || ma - mb;
    })
    .slice(-36);

  if (meses.length < 36) {
    console.warn(`⚠️  Só encontrei ${meses.length} meses completos (esperado 36) — a janela de busca pode precisar ser maior.`);
  }

  console.log('Últimos 3 meses encontrados:');
  meses.slice(-3).forEach(([, { data, valor }]) => {
    console.log(`  ${toMesAno(data)}  →  TR ${valor.toFixed(4)}%`);
  });
  console.log('');

  const entries = meses.map(([, { data, valor }]) =>
    `  { label: '${toLabel(data)}', tr: ${valor.toFixed(4)} }`,
  );

  const agora     = new Date();
  const mesAtual  = `${MESES_PT[agora.getMonth()]}/${agora.getFullYear()}`;
  const primeiro  = toMesAno(meses[0][1].data);
  const ultimo    = toMesAno(meses[meses.length - 1][1].data);

  const novoBloco = [
    `// ─── TR histórica — últimos 36 meses (${primeiro} → ${ultimo}) ───────────────────`,
    `// Fonte: Banco Central do Brasil — Série 226 | Atualizado: ${mesAtual}`,
    `// Valor de cada mês = entrada diária publicada no 1º dia útil do mês (não a`,
    `// entrada especial "1º ao último dia do mesmo mês" que a série também traz —`,
    `// ver scripts/update-tr.js para o motivo dessa escolha).`,
    `export const TR_HISTORICO_36M: { label: string; tr: number }[] = [`,
    entries.join(',\n'),
    `];`,
  ].join('\n');

  const conteudoAtual = fs.readFileSync(CALCULOS_PATH, 'utf8');

  const regex = /\/\/ ─── TR histórica[\s\S]*?^export const TR_HISTORICO_36M[\s\S]*?^\];/m;

  if (!regex.test(conteudoAtual)) {
    throw new Error(
      'Não foi possível localizar TR_HISTORICO_36M em lib/calculos.ts.\n' +
      'Verifique se o padrão do comentário e da declaração não foi alterado.',
    );
  }

  const novoConteudo = conteudoAtual.replace(regex, novoBloco);

  if (novoConteudo === conteudoAtual) {
    console.log('ℹ️  Nenhuma alteração necessária — dados já estão atualizados.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('─── DRY RUN — novo bloco que seria gravado ──────────────────────────────────');
    console.log(novoBloco);
    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log('\n✅ Dry-run concluído. Nenhum arquivo foi alterado.');
  } else {
    fs.writeFileSync(CALCULOS_PATH, novoConteudo, 'utf8');
    console.log(`✅ lib/calculos.ts atualizado com TR de ${primeiro} até ${ultimo}`);
  }
}

main().catch(err => {
  console.error(`\n❌ Erro: ${err.message}`);
  process.exit(1);
});
