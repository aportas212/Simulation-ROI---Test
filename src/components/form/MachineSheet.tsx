import type { Machine } from '../../engine/types';
import { useI18n } from '../../i18n';
import { useFormatters } from '../ui';

/** Fiche technique d'une machine du catalogue (caractéristiques, points forts, hypothèses, source). */
export function MachineSheet({ machine, postLabel }: { machine: Machine; postLabel: (id: string) => string }) {
  const { t } = useI18n();
  const f = useFormatters();
  const touched = [...machine.removedPosts, ...Object.keys(machine.productivities)];

  return (
    <div className="space-y-5">
      <ul className="grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
        {machine.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {h}
          </li>
        ))}
      </ul>

      <dl className="grid gap-x-6 gap-y-1.5 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{t('machine.maxThroughput')}</dt>
          <dd className="text-right font-medium text-slate-900">
            {t(`machine.perHour.${machine.throughputUnit}`, { value: f.integer(machine.maxThroughput) })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{t('machine.outputs')}</dt>
          <dd className="text-right font-medium text-slate-900">
            {machine.outputs === null ? t('machine.na') : f.integer(machine.outputs)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{t('machine.capex')}</dt>
          <dd className="text-right font-medium text-slate-900">
            {machine.capex === null ? t('machine.onRequest') : t('machine.priceHT', { value: f.euro(machine.capex) })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{t('machine.opex')}</dt>
          <dd className="text-right font-medium text-slate-900">
            {machine.opexYear > 0 ? t('preview.perYear', { value: f.euro(machine.opexYear) }) : '—'}
          </dd>
        </div>
        {machine.specs.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-900">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">{t('machine.operators')}</dt>
          <dd className="text-right font-medium text-slate-900">
            {machine.operatorsPerShift > 0
              ? t('machine.operatorsValue', { value: f.number(machine.operatorsPerShift) })
              : t('machine.noOperator')}
          </dd>
        </div>
        {touched.length > 0 && (
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="text-slate-500">{machine.removedPosts.length > 0 ? t('machine.removes') : t('machine.modifies')}</dt>
            <dd className="text-right font-medium text-slate-900">{touched.map(postLabel).join(', ')}</dd>
          </div>
        )}
      </dl>

      {machine.assumptions.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <p className="font-semibold">{t('machine.assumptions')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {machine.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-400">{t('machine.source', { source: machine.source })}</p>
    </div>
  );
}
