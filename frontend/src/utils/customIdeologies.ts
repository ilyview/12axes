import { useEffect, useState } from 'react';
import type { AxisResult } from '../types/quiz';
import type { IdeologyColorKey } from './ideologyColors';
import { pairCompatibility, RESULT_AXIS_IDS, resultVector, type ResultVector } from './peopleCompare';

/**
 * Ideologias criadas pela própria pessoa, só neste navegador (localStorage). Nunca vão para o servidor nem
 * para outra pessoa: a compatibilidade com o resultado é calculada aqui, com a mesma fórmula do backend
 * (pairCompatibility, espelho de ProfileMatchScorer).
 */
export const CUSTOM_IDEOLOGIES_KEY = '12axes-custom-ideologies';
const CHANGE_EVENT = 'axes-custom-ideologies-change';

export interface CustomIdeology {
  id: string;
  name: string;
  /** Categoria do espectro (cor e rótulo), como as do catálogo. */
  category: IdeologyColorKey;
  description: string;
  /** % do polo esquerdo por eixo (0 a 100), na mesma escala dos resultados. */
  vector: Record<string, number>;
}

export const MAX_CUSTOM_IDEOLOGIES = 20;
export const MAX_NAME = 60;
export const MAX_DESCRIPTION = 280;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitize(raw: unknown): CustomIdeology | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<CustomIdeology>;
  if (typeof item.id !== 'string' || typeof item.name !== 'string' || !item.name.trim()) return null;
  const vector: Record<string, number> = {};
  for (const id of RESULT_AXIS_IDS) {
    const value = item.vector?.[id];
    vector[id] = typeof value === 'number' && Number.isFinite(value) ? clamp(value) : 50;
  }
  return {
    id: item.id,
    name: item.name.trim().slice(0, MAX_NAME),
    category: (typeof item.category === 'string' ? item.category : 'centro') as IdeologyColorKey,
    description: typeof item.description === 'string' ? item.description.slice(0, MAX_DESCRIPTION) : '',
    vector
  };
}

export function loadCustomIdeologies(): CustomIdeology[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_IDEOLOGIES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(sanitize).filter((item): item is CustomIdeology => item !== null) : [];
  } catch {
    return [];
  }
}

function persist(list: CustomIdeology[]): void {
  try {
    window.localStorage.setItem(CUSTOM_IDEOLOGIES_KEY, JSON.stringify(list));
  } catch {
    // Sem armazenamento a ideologia vale só até recarregar a página.
  }
  cache = list;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: list }));
}

let cache: CustomIdeology[] | null = null;

export function getCustomIdeologies(): CustomIdeology[] {
  if (!cache) cache = typeof window === 'undefined' ? [] : loadCustomIdeologies();
  return cache;
}

/** Cria ou atualiza (pelo id). Devolve a lista nova. */
export function saveCustomIdeology(item: CustomIdeology): CustomIdeology[] {
  const clean = sanitize(item);
  if (!clean) return getCustomIdeologies();
  const list = getCustomIdeologies();
  const exists = list.some((other) => other.id === clean.id);
  const next = exists ? list.map((other) => (other.id === clean.id ? clean : other)) : [...list, clean].slice(-MAX_CUSTOM_IDEOLOGIES);
  persist(next);
  return next;
}

export function deleteCustomIdeology(id: string): CustomIdeology[] {
  const next = getCustomIdeologies().filter((item) => item.id !== id);
  persist(next);
  return next;
}

export function newCustomIdeologyId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useCustomIdeologies(): CustomIdeology[] {
  const [list, setList] = useState(getCustomIdeologies);
  useEffect(() => {
    const onChange = (event: Event) => setList((event as CustomEvent<CustomIdeology[]>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CUSTOM_IDEOLOGIES_KEY) return;
      cache = loadCustomIdeologies();
      setList(cache);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return list;
}

export function customVector(item: CustomIdeology): ResultVector {
  return RESULT_AXIS_IDS.map((id) => item.vector[id] ?? null);
}

export interface RankedCustomIdeology {
  item: CustomIdeology;
  compatibility: number;
  /** Posição entre as ideologias do catálogo (1 = a mais compatível); null sem o catálogo carregado. */
  rank: number | null;
  /** Quantas ideologias entram na comparação (catálogo + esta). */
  total: number | null;
}

/**
 * Compatibilidade do resultado com cada ideologia própria e o lugar que ela ocuparia no ranking das ideologias do
 * catálogo (vetores em `catalog`, na ordem de RESULT_AXIS_IDS). Sem filtro de religião: é só uma referência.
 */
export function rankCustomIdeologies(
  axes: ReadonlyArray<Pick<AxisResult, 'axisId' | 'leftPercent'>>,
  customs: CustomIdeology[],
  catalog: ResultVector[] | null
): RankedCustomIdeology[] {
  const user = resultVector(axes);
  const catalogScores = catalog ? catalog.map((vector) => pairCompatibility(user, vector)) : null;
  return customs
    .map((item) => {
      const compatibility = pairCompatibility(user, customVector(item));
      const rank = catalogScores ? catalogScores.filter((score) => score > compatibility).length + 1 : null;
      return { item, compatibility, rank, total: catalogScores ? catalogScores.length + 1 : null };
    })
    .sort((a, b) => b.compatibility - a.compatibility);
}

interface TreeData {
  axes: { id: string }[];
  nodes: { vec: number[] }[];
}

const catalogCache = new Map<string, Promise<ResultVector[] | null>>();

/** Vetores das ideologias do catálogo, dos arquivos estáticos da árvore (/tree-data). Null se não houver. */
export function loadIdeologyCatalogVectors(locale = 'pt'): Promise<ResultVector[] | null> {
  const cached = catalogCache.get(locale);
  if (cached) return cached;
  const promise = fetch(`/tree-data/${locale}-ideologies.json`)
    .then((response) => (response.ok ? (response.json() as Promise<TreeData>) : null))
    .then((data) => {
      if (!data?.nodes?.length) return null;
      const index = RESULT_AXIS_IDS.map((id) => data.axes.findIndex((axis) => axis.id === id));
      return data.nodes.map((node) => index.map((position) => (position === -1 ? null : node.vec[position] ?? null)));
    })
    .catch(() => null);
  catalogCache.set(locale, promise);
  return promise;
}
