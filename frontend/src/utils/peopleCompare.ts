import { parseReligion, parseReligionList, type Religion } from './religion';
import { parseShortResult } from './shortLinks';

// Comparação entre duas pessoas: /compare/people?an=Você&a=65,32,...&bn=Julia&b=40,51,...
// (a e b = % do polo esquerdo dos 14 eixos, na ordem de RESULT_URL_KEYS; ra e rb = religião, opcional).
export const PEOPLE_COMPARE_PATH = '/compare/people';

// URL de resultado compartilhável: /results?est=65&rep=32.5&... (uma chave por eixo, valor = % do polo
// esquerdo, na mesma ordem de axes.json e dos ids de HOME_AXES).
export const RESULT_URL_KEYS = ['est', 'rep', 'pod', 'imi', 'dip', 'int', 'eco', 'con', 'com', 'rel', 'mor', 'tec', 'met', 'dis'] as const;

/** Eixo de cada chave de RESULT_URL_KEYS, na mesma ordem (a de axes.json). */
export const RESULT_AXIS_IDS = [
  'estrutura', 'representacao', 'poder', 'imigracao', 'diplomacia', 'intervencao',
  'economia', 'controle', 'comercio', 'religiao', 'moral', 'tecnologia', 'metodo', 'distribuicao'
] as const;

/**
 * Vetor de um resultado na ordem de RESULT_URL_KEYS, com nulo no eixo que ele não tem: eixo desligado nas
 * configurações, ou metodo e distribuicao num resultado de antes deles (os links antigos trazem só 12 chaves).
 */
export type ResultVector = (number | null)[];

export const LEGACY_RESULT_KEY_COUNT = 12;

/** O vetor de um resultado a partir dos eixos dele. */
export function resultVector(axes: ReadonlyArray<{ axisId: string; leftPercent: number }>): ResultVector {
  const byId = new Map(axes.map((axis) => [axis.axisId, axis.leftPercent]));
  return RESULT_AXIS_IDS.map((id) => byId.get(id) ?? null);
}

/** Um vetor vindo de um link tem todos os eixos ou só os 12 dos links antigos. */
export function isResultVectorLength(length: number): boolean {
  return length === RESULT_URL_KEYS.length || length === LEGACY_RESULT_KEY_COUNT;
}

/** Completa um vetor antigo (12 valores) com nulos nos eixos novos. */
export function fullVector(values: ResultVector): ResultVector {
  return values.length >= RESULT_URL_KEYS.length ? values : [...values, ...Array(RESULT_URL_KEYS.length - values.length).fill(null)];
}

/**
 * O vetor como vai para a API e para os links ("65,,40,..."). Sem os dois eixos novos, sai no formato antigo,
 * de 12 valores: o mesmo pedido (e o mesmo cache) de antes.
 */
export function serializeVector(values: ResultVector, separator = ',', format: (value: number) => string = String): string {
  const full = fullVector(values);
  const trimmed = full.slice(LEGACY_RESULT_KEY_COUNT).every((value) => value === null) ? full.slice(0, LEGACY_RESULT_KEY_COUNT) : full;
  return trimmed.map((value) => (value === null ? '' : format(value))).join(separator);
}

/** Lê um vetor serializado: posição vazia vira nulo; null se o tamanho ou algum valor for inválido. */
export function parseVectorText(raw: string, separator: RegExp | string = ','): ResultVector | null {
  const parts = raw.split(separator);
  if (!isResultVectorLength(parts.length)) return null;
  const values = parts.map((part) => (part.trim() === '' ? null : Number(part)));
  if (values.every((value) => value === null)) return null;
  if (values.some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > 100))) return null;
  return fullVector(values);
}

/** As chaves do resultado presentes no link (eixos desligados ou inexistentes no resultado ficam de fora). */
export function resultUrlKeysIn(get: (key: string) => string | null | undefined): string[] {
  return RESULT_URL_KEYS.filter((key) => (get(key) ?? '').trim() !== '');
}

export const MAX_NAME_LENGTH = 40;

// Dois perfis ficam em lados opostos de um eixo quando cada um passa do centro (50%) por pelo menos esta folga,
// cada um para um polo. Ficar perto do centro mas já do outro lado conta: o ponto na trilha cruza a linha do meio.
export const OPPOSITE_SIDE_MARGIN = 2;

export interface PersonResult {
  values: ResultVector;
  /** A religião (a primeira, quando há várias): usada nos ícones e nos valores. */
  religion: Religion | null;
  /** Todas as religiões, separadas por vírgula ("catholic,protestant"), quando o perfil tem mais de uma; o filtro usa todas. */
  religionFilter?: string | null;
}

/** O que vai para a API como preferência religiosa: todas as religiões da pessoa, ou a única. */
export function religionPreference(person: PersonResult): string | null {
  return person.religionFilter ?? person.religion;
}

function personReligion(raw: string | null): Pick<PersonResult, 'religion' | 'religionFilter'> {
  const list = parseReligionList(raw);
  return list.length > 1 ? { religion: list[0], religionFilter: list.join(',') } : { religion: list[0] ?? null };
}

export type ResultLinkProblem = { kind: 'empty' } | { kind: 'missing'; keys: string[] } | { kind: 'invalid'; keys: string[] };

export type ResultLinkParse = ({ ok: true } & PersonResult) | { ok: false; problem: ResultLinkProblem };

/**
 * Lê o link de resultado de qualquer jeito que a pessoa o cole: URL completa, só o caminho
 * (/results?est=...), só a query (?est=... ou est=...), com #âncora, com &amp; ou com espaços em volta.
 * Só importa o que vem depois do "?": domínio, caminho e idioma são ignorados e a ordem das chaves
 * não conta. Chaves desconhecidas passam; faltar um eixo ou trazer valor fora de 0 a 100 é erro.
 */
export function parseResultLink(raw: string): ResultLinkParse {
  const text = raw.trim().replace(/&amp;/gi, '&').replace(/#.*$/, '');
  if (!text) return { ok: false, problem: { kind: 'empty' } };
  const query = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
  const params = new URLSearchParams(query);
  const byKey = new Map<string, string>();
  params.forEach((value, key) => byKey.set(key.trim().toLowerCase(), value.trim()));

  const keys = resultUrlKeysIn((key) => byKey.get(key));
  // Link curto do QR do cartão (/r?v=70-80-…&r=c): os valores num só parâmetro.
  if (keys.length === 0 && byKey.has('v')) {
    const short = parseShortResult(query);
    if (short) return { ok: true, values: short.values, religion: short.religion };
    return { ok: false, problem: { kind: 'invalid', keys: ['v'] } };
  }
  if (keys.length === 0) return { ok: false, problem: { kind: 'missing', keys: [...RESULT_URL_KEYS] } };

  const values: ResultVector = RESULT_URL_KEYS.map((key) =>
    keys.includes(key) ? Number((byKey.get(key) ?? '').replace(',', '.')) : null
  );
  const invalid = RESULT_URL_KEYS.filter((_, index) => {
    const value = values[index];
    return value !== null && (!Number.isFinite(value) || value < 0 || value > 100);
  });
  if (invalid.length > 0) return { ok: false, problem: { kind: 'invalid', keys: invalid } };

  return { ok: true, values, religion: parseReligion(byKey.get('religion')) };
}

export interface PeopleCompareLink {
  names: [string, string];
  people: [PersonResult, PersonResult];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

function parseVector(raw: string | null): ResultVector | null {
  return parseVectorText(raw ?? '');
}

export function cleanName(raw: string | null | undefined, fallback: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) || fallback;
}

/** "E" para "Enzo"; "EX" para "Enzo Xavier" (e para mais de duas palavras, só as duas primeiras). */
export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => Array.from(word)[0]).join('').toUpperCase() || '?';
}

/** Primeiro nome, para as etiquetas pequenas ("Enzo" para "Enzo Xavier Santos"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function peopleCompareUrl({ names, people }: PeopleCompareLink): string {
  const params = new URLSearchParams();
  params.set('an', names[0]);
  params.set('a', serializeVector(people[0].values, ',', (value) => String(round1(value))));
  if (religionPreference(people[0])) params.set('ra', religionPreference(people[0]) as string);
  params.set('bn', names[1]);
  params.set('b', serializeVector(people[1].values, ',', (value) => String(round1(value))));
  if (religionPreference(people[1])) params.set('rb', religionPreference(people[1]) as string);
  return `${PEOPLE_COMPARE_PATH}?${params.toString()}`;
}

/** Null quando o link não traz os dois vetores completos. */
export function parsePeopleCompareUrl(search: string, fallbackNames: [string, string]): PeopleCompareLink | null {
  const params = new URLSearchParams(search);
  const first = parseVector(params.get('a'));
  const second = parseVector(params.get('b'));
  if (!first || !second) return null;
  return {
    names: [cleanName(params.get('an'), fallbackNames[0]), cleanName(params.get('bn'), fallbackNames[1])],
    people: [
      { values: first, ...personReligion(params.get('ra')) },
      { values: second, ...personReligion(params.get('rb')) }
    ]
  };
}

// Compatibilidade entre dois vetores: mesma fórmula do backend (ProfileMatchScorer.compatibility), para
// "você × outra pessoa" bater com o resto do site sem precisar de um endpoint novo.
const CENTER = 50;
const AXIS_SPREAD = 50;
const AXIS_WEIGHT = 0.42;
const DIRECTION_WEIGHT = 0.33;
const MAGNITUDE_WEIGHT = 0.18;
const OUTLIER_WEIGHT = 0.07;
const OPPOSITE_SIDE_MAX_PENALTY = 0.45;
const OPPOSITE_SIDE_SPREAD = 25;
const OUTLIER_FULL_SPREAD = 100;
const OUTLIER_EXPONENT = 2.5;
const DIRECTION_AUGMENT_RADIUS = 8;

export function pairCompatibility(first: ResultVector, second: ResultVector): number {
  // Só os eixos que as duas pessoas têm (desligado ou inexistente em uma delas fica fora), como no backend.
  const shared: [number, number][] = [];
  for (let i = 0; i < Math.min(first.length, second.length); i += 1) {
    const a = first[i];
    const b = second[i];
    if (a !== null && a !== undefined && b !== null && b !== undefined) shared.push([a, b]);
  }
  const size = shared.length;
  if (size === 0) return 0;
  let axisTotal = 0;
  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;
  let firstIntensity = 0;
  let secondIntensity = 0;
  let maxDiff = 0;
  for (const [a, b] of shared) {
    const diff = Math.abs(a - b);
    let similarity = Math.max(0, 1 - (diff / AXIS_SPREAD) ** 2);
    if ((a - CENTER) * (b - CENTER) < 0) {
      similarity *=
        1 -
        OPPOSITE_SIDE_MAX_PENALTY *
          Math.tanh(Math.abs(a - CENTER) / OPPOSITE_SIDE_SPREAD) *
          Math.tanh(Math.abs(b - CENTER) / OPPOSITE_SIDE_SPREAD);
    }
    axisTotal += similarity;
    dot += (a - CENTER) * (b - CENTER);
    firstNorm += (a - CENTER) ** 2;
    secondNorm += (b - CENTER) ** 2;
    firstIntensity += Math.abs(a - CENTER);
    secondIntensity += Math.abs(b - CENTER);
    maxDiff = Math.max(maxDiff, diff);
  }
  const augment = size * DIRECTION_AUGMENT_RADIUS * DIRECTION_AUGMENT_RADIUS;
  const cosine = (dot + augment) / Math.sqrt((firstNorm + augment) * (secondNorm + augment));
  const axisSimilarity = (100 * axisTotal) / size;
  const directionSimilarity = CENTER + CENTER * cosine;
  const magnitudeSimilarity = 100 - 2 * Math.abs(firstIntensity / size - secondIntensity / size);
  const outlierSimilarity = 100 * Math.max(0, 1 - (maxDiff / OUTLIER_FULL_SPREAD) ** OUTLIER_EXPONENT);
  const score =
    AXIS_WEIGHT * axisSimilarity +
    DIRECTION_WEIGHT * directionSimilarity +
    MAGNITUDE_WEIGHT * magnitudeSimilarity +
    OUTLIER_WEIGHT * outlierSimilarity;
  return round1(Math.max(0, Math.min(100, score)));
}

/** Vetor médio das duas pessoas, para achar a ideologia que têm em comum. */
export function midpoint(first: ResultVector, second: ResultVector): ResultVector {
  const size = Math.min(first.length, second.length);
  return first.slice(0, size).map((value, index) => {
    const other = second[index];
    return value === null || other === null ? null : round1((value + other) / 2);
  });
}
