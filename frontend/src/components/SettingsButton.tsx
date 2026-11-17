import { useState } from 'react';
import { t } from '../i18n';
import { HOME_AXES } from '../data/homeAxes';
import { PoleIcon } from './AxisIcon';
import { InfoSheet } from './results/InfoSheet';
import { saveSettings, useSettings, type UserSettings } from '../utils/settings';

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (next: boolean) => void; label: string; hint?: string }) {
  return (
    <button className="e-set-row" type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="e-set-text">
        <span className="e-set-label">{label}</span>
        {hint && <span className="e-set-hint">{hint}</span>}
      </span>
      <span className="e-set-switch" aria-hidden="true" />
    </button>
  );
}

/** Engrenagem do cabeçalho: abre as configurações (botão rosa, perfis de brincadeira e eixos do teste). */
export function SettingsButton({ onAxesChanged }: { onAxesChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const s = t.settings;
  const axes = HOME_AXES.map((axis) => ({ ...axis, ...(t.homeAxes[axis.id] ?? {}) }));
  const update = (patch: Partial<UserSettings>) => saveSettings({ ...settings, ...patch });

  const toggleAxis = (id: string, on: boolean) => {
    const disabled = on ? settings.disabledAxes.filter((axisId) => axisId !== id) : [...settings.disabledAxes, id];
    // Pelo menos um eixo fica ligado: sem nenhum, não haveria teste.
    if (disabled.length >= axes.length) return;
    update({ disabledAxes: disabled });
    onAxesChanged?.();
  };

  return (
    <>
      <button className="e-set-btn" type="button" aria-label={s.open} title={s.open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>
      {open && (
        <InfoSheet titleId="e-settings-title" className="e-set-sheet" onClose={() => setOpen(false)}>
          <h3 id="e-settings-title">{s.title}</h3>

          <p className="e-set-section">{s.displaySection}</p>
          <Switch checked={settings.cuteButton} onChange={(on) => update({ cuteButton: on })} label={s.cuteButton} hint={s.cuteButtonHint} />
          <Switch checked={settings.jokes} onChange={(on) => update({ jokes: on })} label={s.jokes} hint={s.jokesHint} />

          <p className="e-set-section">{s.axesSection}</p>
          <p className="e-set-note">{s.axesNote}</p>
          <div className="e-set-axes">
            {axes.map((axis) => {
              const on = !settings.disabledAxes.includes(axis.id);
              return (
                <button key={axis.id} className="e-set-axis" type="button" role="switch" aria-checked={on} onClick={() => toggleAxis(axis.id, !on)}>
                  <span className="e-set-axis-icon" style={{ color: on ? axis.leftColor : undefined }}>
                    <PoleIcon axisId={axis.id} side="left" />
                  </span>
                  <span className="e-set-axis-text">
                    <span className="e-set-label">{axis.label}</span>
                    <span className="e-set-hint">
                      {axis.leftPole} ↔ {axis.rightPole}
                    </span>
                  </span>
                  <span className="e-set-switch" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {settings.disabledAxes.length > 0 && (
            <button className="e-btn e-btn-ghost e-btn-sm e-set-reset" type="button" onClick={() => update({ disabledAxes: [] })}>
              {s.allAxesOn}
            </button>
          )}
        </InfoSheet>
      )}
    </>
  );
}
