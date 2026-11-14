import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const levels = [0.05, 0.25, 0.5, 0.75, 0.95];
const normalScores = [-1.644854, -0.674490, 0, 0.674490, 1.644854];
const referenceScale = 0.0025;

type Market = { id: string; prices: number[] };
type ForecastCase = { horizon_minutes: number; quantiles: number[]; markets: Market[] };

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const boundedPrice = (value: number): number => Math.round(clamp(value, 0, 1) * 1_000_000) / 1_000_000 + 0;

function localScale(series: number[], window: number): number {
  const count = Math.min(window, series.length - 1);
  if (count < 2) return referenceScale;
  let squares = 0;
  for (let i = series.length - count; i < series.length; i++) {
    const delta = series[i] - series[i - 1];
    squares += delta * delta;
  }
  return Math.sqrt(squares / count);
}

function makeRows(market: Market, horizon: number): number[][] {
  const prices = market.prices;
  if (prices.length === 0) throw new Error(`missing observed prices for ${market.id}`);
  const current = prices[prices.length - 1];
  const short = localScale(prices, 90);
  const medium = localScale(prices, 360);
  const long = localScale(prices, 1440);
  const variance = 0.50 * short ** 2 + 0.30 * medium ** 2 + 0.20 * long ** 2;
  // The unshrunk walk overcovers quiet practice intervals; calibrate its width down while retaining recent activity.
  const sigma = clamp(Math.sqrt(0.55 * variance + 0.45 * referenceScale ** 2) * 0.25, 0.0002, 0.0100);
  const rows: number[][] = [];
  for (let step = 1; step <= horizon; step++) {
    const width = sigma * Math.sqrt(step);
    rows.push(normalScores.map(score => boundedPrice(current + score * width)));
  }
  return rows;
}

mkdirSync(outputDir, { recursive: true });
const cases = readdirSync(inputDir).filter(file => file.endsWith('.in')).sort();
for (const filename of cases) {
  const caseId = filename.slice(0, -3);
  const input = JSON.parse(readFileSync(join(inputDir, filename), 'utf8')) as ForecastCase;
  if (input.quantiles.length !== levels.length || input.quantiles.some((value, index) => value !== levels[index])) {
    throw new Error(`unexpected quantile levels in ${filename}`);
  }
  const forecasts = input.markets.map(market => ({ id: market.id, q: makeRows(market, input.horizon_minutes) }));
  writeFileSync(join(outputDir, `${caseId}.out`), `${JSON.stringify({ forecasts })}\n`);
}
