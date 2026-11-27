import { useEffect, useMemo, useState } from 'react';
import { LANG, t } from '../../i18n';
import type { AxisResult } from '../../types/quiz';
import { ideologyColorByKey } from '../../utils/ideologyColors';
import {
  loadIdeologyCatalogVectors,
  rankCustomIdeologies,
  useCustomIdeologies,
  type CustomIdeology
} from '../../utils/customIdeologies';
import type { ResultVector } from '../../utils/peopleCompare';
import { CustomIdeologyEditor } from '../CustomIdeologyEditor';

/** As ideologias criadas pela pessoa (só neste navegador), com a compatibilidade e o lugar no ranking do catálogo. */
export function CustomIdeologiesSection({ axes }: { axes: AxisResult[] }) {
  const c = t.customIdeology;
  const customs = useCustomIdeologies();
  const [catalog, setCatalog] = useState<ResultVector[] | null>(null);
  const [editing, setEditing] = useState<CustomIdeology | 'new' | null>(null);

  useEffect(() => {
    if (customs.length === 0) return;
    let cancelled = false;
    loadIdeologyCatalogVectors(LANG).then((vectors) => {
      if (!cancelled) setCatalog(vectors);
    });
    return () => {
      cancelled = true;
    };
  }, [customs.length]);

  const ranked = useMemo(() => rankCustomIdeologies(axes, customs, catalog), [axes, customs, catalog]);
  const userVector = useMemo(() => Object.fromEntries(axes.map((axis) => [axis.axisId, axis.leftPercent])), [axes]);

  return (
    <section className="e-panel e-custom-panel" id="ideologias-proprias" data-reveal>
      <div className="e-custom-panel-head">
        <div>
          <h2 className="e-sec-title">{c.sectionTitle}</h2>
          <p className="e-set-note">{c.privacyNote}</p>
        </div>
        <button className="e-btn e-btn-primary e-btn-sm" type="button" onClick={() => setEditing('new')}>
          + {c.addButton}
        </button>
      </div>
      {ranked.length === 0 ? (
        <p className="e-set-hint">{c.empty}</p>
      ) : (
        <ul className="e-custom-list">
          {ranked.map(({ item, compatibility, rank, total }) => {
            const color = ideologyColorByKey(item.category);
            return (
              <li key={item.id}>
                <button type="button" className="e-custom-card" style={{ '--c': color.base, '--cb': color.bg } as React.CSSProperties} onClick={() => setEditing(item)}>
                  <span className="e-custom-card-main">
                    <span className="e-custom-card-cat">{t.compassSpectrumLabels[item.category as keyof typeof t.compassSpectrumLabels] ?? item.category}</span>
                    <span className="e-custom-card-name">{item.name}</span>
                    {item.description && <span className="e-set-hint">{item.description}</span>}
                    {rank !== null && total !== null && (
                      <span className="e-custom-card-rank">{rank === 1 ? c.bestMatch : c.rank(rank, total)}</span>
                    )}
                  </span>
                  <span className="e-custom-card-pct">
                    {compatibility.toFixed(1).replace('.0', '')}%<small>{c.compatibility}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <CustomIdeologyEditor initial={editing === 'new' ? null : editing} userVector={userVector} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
