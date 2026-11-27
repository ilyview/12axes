import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteCustomIdeology,
  getCustomIdeologies,
  rankCustomIdeologies,
  saveCustomIdeology,
  type CustomIdeology
} from './customIdeologies';
import { RESULT_AXIS_IDS } from './peopleCompare';

const vectorOf = (value: number) => Object.fromEntries(RESULT_AXIS_IDS.map((id) => [id, value]));
const axesOf = (value: number) => RESULT_AXIS_IDS.map((axisId) => ({ axisId, leftPercent: value }));

function ideology(id: string, value: number): CustomIdeology {
  return { id, name: id, category: 'centro', description: '', vector: vectorOf(value) };
}

describe('ideologias próprias', () => {
  beforeEach(() => {
    for (const item of getCustomIdeologies()) deleteCustomIdeology(item.id);
  });

  it('guarda, atualiza e apaga só neste navegador', () => {
    saveCustomIdeology(ideology('a', 80));
    saveCustomIdeology({ ...ideology('a', 80), name: 'Nova' });
    expect(getCustomIdeologies()).toHaveLength(1);
    expect(getCustomIdeologies()[0].name).toBe('Nova');
    deleteCustomIdeology('a');
    expect(getCustomIdeologies()).toHaveLength(0);
  });

  it('valores fora de 0 a 100 são corrigidos e eixo faltando vira 50', () => {
    saveCustomIdeology({ ...ideology('b', 50), vector: { estrutura: 140, poder: -5 } });
    const saved = getCustomIdeologies()[0];
    expect(saved.vector.estrutura).toBe(100);
    expect(saved.vector.poder).toBe(0);
    expect(saved.vector.moral).toBe(50);
  });

  it('a ideologia idêntica ao resultado fica em primeiro, à frente do catálogo', () => {
    const catalog = [RESULT_AXIS_IDS.map(() => 20), RESULT_AXIS_IDS.map(() => 75)];
    const [first, second] = rankCustomIdeologies(axesOf(80), [ideology('longe', 10), ideology('igual', 80)], catalog);
    expect(first.item.id).toBe('igual');
    expect(first.compatibility).toBe(100);
    expect(first.rank).toBe(1);
    expect(first.total).toBe(3);
    expect(second.rank).toBe(3);
  });

  it('sem o catálogo, mostra só a compatibilidade', () => {
    const [only] = rankCustomIdeologies(axesOf(60), [ideology('x', 60)], null);
    expect(only.rank).toBeNull();
    expect(only.compatibility).toBe(100);
  });
});
