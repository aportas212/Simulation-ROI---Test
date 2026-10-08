import { MACHINES } from '../../config/machines';
import { useI18n } from '../../i18n';
import { Alerts } from '../Alerts';
import { NumberField, useFormatters } from '../ui';
import type { StepProps } from './types';

export function StepMachine({ inputs, update, result }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const labelOf = (id: string) => inputs.staffing.posts.find((p) => p.id === id)?.label;
  const machineAlerts = result.alerts.filter((a) => a.code === 'capacityExceeded' || a.code === 'outputsExceeded');

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('machine.title')}</h2>
        <p className="mt-1 text-slate-600">{t('machine.intro')}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3" role="radiogroup">
        {MACHINES.map((m) => {
          const selected = m.id === inputs.machineId;
          const modified = Object.keys(m.productivities).map(labelOf).filter(Boolean);
          const removed = m.removedPosts.map(labelOf).filter(Boolean);
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => update((d) => ({ ...d, machineId: m.id }))}
              className={`flex flex-col rounded-xl border-2 p-5 text-left transition-all ${
                selected ? 'border-accent bg-accent-soft/60 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                  {t(`machine.type.${m.type}`)}
                </span>
                {selected && <span className="text-xs font-bold uppercase tracking-wide text-accent">✓ {t('machine.selected')}</span>}
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{m.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{m.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500">{t('machine.maxThroughput')}</dt>
                <dd className="text-right font-semibold tabular-nums">{t('machine.unitsPerHour', { value: f.integer(m.maxThroughput) })}</dd>
                <dt className="text-slate-500">{t('machine.outputs')}</dt>
                <dd className="text-right font-semibold tabular-nums">{f.integer(m.outputs)}</dd>
                <dt className="text-slate-500">{t('machine.capex')}</dt>
                <dd className="text-right font-semibold tabular-nums">{f.euroCompact(m.capex)}</dd>
                <dt className="text-slate-500">{t('machine.opex')}</dt>
                <dd className="text-right font-semibold tabular-nums">{t('preview.perYear', { value: f.euroCompact(m.opexYear) })}</dd>
              </dl>
              {(removed.length > 0 || modified.length > 0) && (
                <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-600">
                  {removed.length > 0 && <p><span className="font-semibold text-slate-800">{t('machine.removes')} :</span> {removed.join(', ')}</p>}
                  {modified.length > 0 && <p><span className="font-semibold text-slate-800">{t('machine.modifies')} :</span> {modified.join(', ')}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="sm:max-w-xs">
        <NumberField
          label={t('machine.quantity')}
          value={inputs.machineQuantity}
          min={1}
          max={10}
          onChange={(x) => update((d) => ({ ...d, machineQuantity: Math.max(1, Math.round(x ?? 1)) }))}
        />
      </div>

      <Alerts alerts={machineAlerts} />
    </div>
  );
}
