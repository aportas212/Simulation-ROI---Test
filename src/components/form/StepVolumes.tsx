import { useI18n } from '../../i18n';
import { NumberField, NumberInput, useFormatters } from '../ui';
import type { StepProps } from './types';

export function StepVolumes({ inputs, update }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const v = inputs.volumes;
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    update((d) => ({ ...d, volumes: { ...d.volumes, [key]: value } }));
  const setMix = (key: 'standard' | 'fragile' | 'specific', value: number) =>
    update((d) => ({ ...d, volumes: { ...d.volumes, mix: { ...d.volumes.mix, [key]: value } } }));

  const mixTotal = v.mix.standard + v.mix.fragile + v.mix.specific;
  const mixOk = Math.abs(mixTotal - 100) < 0.01;
  const growth = v.ordersPerDayCurrent > 0 ? (v.ordersPerDayFuture / v.ordersPerDayCurrent - 1) * 100 : null;

  const mixRows = [
    { key: 'standard' as const, label: t('volumes.mixStandard'), color: 'bg-accent' },
    { key: 'fragile' as const, label: t('volumes.mixFragile'), color: 'bg-amber-500' },
    { key: 'specific' as const, label: v.mix.specificLabel || t('volumes.mixSpecific'), color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('volumes.title')}</h2>
        <p className="mt-1 text-slate-600">{t('volumes.intro')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label={t('volumes.ordersCurrent')} value={v.ordersPerDayCurrent} onChange={(x) => set('ordersPerDayCurrent', x ?? 0)} />
        <NumberField
          label={t('volumes.ordersFuture')}
          value={v.ordersPerDayFuture}
          onChange={(x) => set('ordersPerDayFuture', x ?? 0)}
          hint={growth !== null ? t('volumes.ordersFutureHint', { pct: `${growth >= 0 ? '+' : ''}${f.percent(growth)}` }) : undefined}
        />
        <NumberField label={t('volumes.productsPerOrder')} value={v.productsPerOrder} onChange={(x) => set('productsPerOrder', x ?? 0)} />
        <NumberField label={t('volumes.hoursPerDay')} value={v.hoursPerDay} max={24} suffix="h" onChange={(x) => set('hoursPerDay', x ?? 0)} />
        <NumberField label={t('volumes.shiftsPerDay')} value={v.shiftsPerDay} max={4} onChange={(x) => set('shiftsPerDay', x ?? 0)} />
        <NumberField label={t('volumes.daysPerYear')} value={v.daysPerYear} max={366} onChange={(x) => set('daysPerYear', x ?? 0)} />
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{t('volumes.mixTitle')}</h3>
          <span className={`text-sm font-semibold tabular-nums ${mixOk ? 'text-emerald-700' : 'text-red-700'}`}>
            {mixOk ? `✓ ${t('volumes.mixTotalOk')}` : t('volumes.mixTotal', { total: f.number(mixTotal, 2) })}
          </span>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          {mixRows.map((r) => (
            <div key={r.key} className={`${r.color} border-r-2 border-white last:border-r-0`} style={{ width: `${Math.min(100, Math.max(0, v.mix[r.key]))}%` }} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {mixRows.map((r) => (
            <div key={r.key}>
              <div className="label flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${r.color}`} aria-hidden />
                {r.label}
              </div>
              <NumberInput ariaLabel={r.label} value={v.mix[r.key]} max={100} suffix="%" onChange={(x) => setMix(r.key, x ?? 0)} />
            </div>
          ))}
        </div>

        <div className="mt-4 sm:max-w-sm">
          <label className="label" htmlFor="specific-label">{t('volumes.mixSpecificLabel')}</label>
          <input
            id="specific-label"
            className="input"
            value={v.mix.specificLabel}
            placeholder={t('volumes.mixSpecificPlaceholder')}
            onChange={(e) => update((d) => ({ ...d, volumes: { ...d.volumes, mix: { ...d.volumes.mix, specificLabel: e.target.value } } }))}
          />
        </div>

        {!mixOk && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">
            {t('volumes.mixTotalError', { total: f.number(mixTotal, 2) })}
          </p>
        )}
      </section>
    </div>
  );
}
