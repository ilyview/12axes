import { useState } from 'react';
import { t } from '../i18n';
import { HOME_AXES } from '../data/homeAxes';
import { PoleIcon } from './AxisIcon';
import { InfoSheet } from './results/InfoSheet';
import { ideologyColorByKey, SPECTRUM_ORDER, type IdeologyColorKey } from '../utils/ideologyColors';
import {
  deleteCustomIdeology,
  MAX_DESCRIPTION,
  MAX_NAME,
  newCustomIdeologyId,
  saveCustomIdeology,
  type CustomIdeology
} from '../utils/customIdeologies';

interface Props {
  /** Ideologia a editar; sem ela, cria uma nova. */
  initial?: CustomIdeology | null;
  /** Posição do usuário por eixo (% do polo esquerdo), para "usar meu resultado". */
  userVector?: Record<string, number> | null;
  onClose: () => void;
}

function emptyVector(): Record<string, number> {
  return Object.fromEntries(HOME_AXES.map((axis) => [axis.id, 50]));
}

/** Editor de uma ideologia própria: nome, categoria, descrição e a posição em cada eixo. Fica só neste navegador. */
export function CustomIdeologyEditor({ initial, userVector, onClose }: Props) {
  const c = t.customIdeology;
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<IdeologyColorKey>(initial?.category ?? 'centro');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [vector, setVector] = useState<Record<string, number>>(() => ({ ...emptyVector(), ...(initial?.vector ?? {}) }));
  const axes = HOME_AXES.map((axis) => ({ ...axis, ...(t.homeAxes[axis.id] ?? {}) }));
  const color = ideologyColorByKey(category);
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    saveCustomIdeology({ id: initial?.id ?? newCustomIdeologyId(), name: name.trim(), category, description: description.trim(), vector });
    onClose();
  };

  return (
    <InfoSheet titleId="e-custom-title" className="e-set-sheet e-custom-sheet" onClose={onClose}>
      <h3 id="e-custom-title">{initial ? c.editTitle : c.newTitle}</h3>
      <p className="e-set-note">{c.privacyNote}</p>

      <label className="e-custom-field">
        <span className="e-set-label">{c.nameLabel}</span>
        <input type="text" value={name} maxLength={MAX_NAME} placeholder={c.namePlaceholder} onChange={(event) => setName(event.target.value)} />
      </label>

      <label className="e-custom-field">
        <span className="e-set-label">{c.categoryLabel}</span>
        <span className="e-custom-select" style={{ '--c': color.base, '--cb': color.bg } as React.CSSProperties}>
          <select value={category} onChange={(event) => setCategory(event.target.value as IdeologyColorKey)}>
            {SPECTRUM_ORDER.map((option) => (
              <option key={option.key} value={option.key}>
                {t.compassSpectrumLabels[option.key as keyof typeof t.compassSpectrumLabels] ?? option.key}
              </option>
            ))}
          </select>
        </span>
      </label>

      <label className="e-custom-field">
        <span className="e-set-label">{c.descriptionLabel}</span>
        <textarea rows={3} value={description} maxLength={MAX_DESCRIPTION} placeholder={c.descriptionPlaceholder} onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className="e-custom-axes-head">
        <p className="e-set-section">{c.axesLabel}</p>
        {userVector && (
          <button className="e-btn e-btn-ghost e-btn-sm" type="button" onClick={() => setVector({ ...emptyVector(), ...userVector })}>
            {c.fromResult}
          </button>
        )}
      </div>
      <div className="e-custom-axes">
        {axes.map((axis) => {
          const left = vector[axis.id] ?? 50;
          const balanced = Math.abs(left - 50) < 7.5;
          const pole = left >= 50 ? axis.leftPole : axis.rightPole;
          const pct = Math.round(left >= 50 ? left : 100 - left);
          return (
            <div key={axis.id} className="e-custom-axis">
              <div className="e-custom-axis-top">
                <span className="e-set-label">{axis.label}</span>
                <span className="e-set-hint" style={{ color: balanced ? undefined : left >= 50 ? axis.leftColor : axis.rightColor }}>
                  {balanced ? c.balanced : `${pct}% ${pole}`}
                </span>
              </div>
              <div className="e-custom-axis-row">
                <span className="e-custom-pole" style={{ color: axis.leftColor }} title={axis.leftPole}>
                  <PoleIcon axisId={axis.id} side="left" />
                </span>
                {/* O controle vai do polo esquerdo (à esquerda) ao direito: o valor guardado é o % do polo esquerdo. */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={100 - left}
                  aria-label={`${axis.label}: ${axis.leftPole} ↔ ${axis.rightPole}`}
                  onChange={(event) => setVector((current) => ({ ...current, [axis.id]: 100 - Number(event.target.value) }))}
                />
                <span className="e-custom-pole" style={{ color: axis.rightColor }} title={axis.rightPole}>
                  <PoleIcon axisId={axis.id} side="right" />
                </span>
              </div>
              <div className="e-custom-axis-poles">
                <span>{axis.leftPole}</span>
                <span>{axis.rightPole}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="e-custom-actions">
        {initial && (
          <button
            className="e-btn e-btn-ghost e-btn-sm e-custom-delete"
            type="button"
            onClick={() => {
              deleteCustomIdeology(initial.id);
              onClose();
            }}
          >
            {c.delete}
          </button>
        )}
        <button className="e-btn e-btn-ghost e-btn-sm" type="button" onClick={onClose}>
          {c.cancel}
        </button>
        <button className="e-btn e-btn-primary e-btn-sm" type="button" disabled={!valid} onClick={save}>
          {c.save}
        </button>
      </div>
    </InfoSheet>
  );
}
