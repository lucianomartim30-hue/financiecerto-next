#!/usr/bin/env node
/**
 * update-tr.js
 *
 * Busca os últimos 36 meses de TR na API do Banco Central (Série 226)
 * e atualiza o array TR_HISTORICO_36M em lib/calculos.ts.
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
const BCB_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/36?formato=json';
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DRY_RUN  = process.argv.includes('--dry-run');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'financiecerto-update-tr/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`BCB retornou HTTP ${res.statusCode}`));
        res.resume();
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔍 Buscando últimos 36 meses de TR no BCB...`);
  console.log(`   URL: ${BCB_URL}\n`);

  const dados = await fetchJSON(BCB_URL);

  if (!Array.isArray(dados) || dados.length === 0) {
    throw new Error('BCB retornou resposta vazia ou inválida');
  }

  console.log(`✅ Recebidos ${dados.length} registros\n`);

  // Preview dos últimos 3 meses recebidos
  console.log('Últimos 3 meses:');
  dados.slice(-3).forEach(({ data, valor }) => {
    console.log(`  ${data}  →  TR ${parseFloat(valor).toFixed(4)}%`);
  });
  console.log('');

  // Monta as entradas do array TypeScript
  const entries = dados.map(({ data, valor }) =>
    `  { label: '${toLabel(data)}', tr: ${parseFloat(valor).toFixed(4)} }`,
  );

  // Cabeçalho do bloco
  const hoje     = new Date();
  const mesAtual = `${MESES_PT[hoje.getMonth()]}/${hoje.getFullYear()}`;
  const primeiro = toMesAno(dados[0].data);
  const ultimo   = toMesAno(dados[dados.length - 1].data);

  const novoBloco = [
    `// ─── TR histórica — últimos 36 meses (${primeiro} → ${ultimo}) ───────────────────`,
    `// Fonte: Banco Central do Brasil — Série 226 | Atualizado: ${mesAtual}`,
    `export const TR_HISTORICO_36M: { label: string; tr: number }[] = [`,
    entries.join(',\n'),
    `];`,
  ].join('\n');

  // Lê o arquivo atual
  const conteudoAtual = fs.readFileSync(CALCULOS_PATH, 'utf8');

  // Regex que captura o bloco inteiro (comentário + export const ... ];)
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
