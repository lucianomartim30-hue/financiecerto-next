/**
 * lib/bot-detect.ts
 * Filtro simples de bots/crawlers por User-Agent — usado nas rotas de
 * rastreio (visita, listagem, simulação) pra não inflar os números com
 * tráfego que o Google Analytics e a Vercel Analytics já filtram por conta
 * própria. Sem isso, Googlebot, GPTBot, ClaudeBot e outros crawlers que
 * executam JavaScript (inclusive pra indexação/SEO, que é desejável)
 * disparavam os mesmos eventos de um visitante real, fazendo o rastreio
 * interno mostrar mais "viu imóvel" do que visitas reais nos analytics
 * (bug real, achado 2026-09-03).
 */

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|ahrefsbot|semrushbot|mj12bot|dotbot|gptbot|chatgpt-user|ccbot|claudebot|claude-web|anthropic|perplexitybot|bytespider|applebot|petalbot|screaming frog|headlesschrome|phantomjs|puppeteer|playwright/i;

export function isBotRequest(req: Request | { headers: { get(name: string): string | null } }): boolean {
  const ua = req.headers.get('user-agent') || '';
  if (!ua) return true; // sem user-agent nenhum é típico de script/bot, não de navegador real
  return BOT_UA_PATTERN.test(ua);
}
