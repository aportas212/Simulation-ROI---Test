import { defaultPeakThroughput } from '../../engine';
import { useI18n } from '../../i18n';
import { NumberField, useFormatters } from '../ui';
import type { StepProps } from './types';

export function StepFlows({ inputs, update, result }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const computedPeak = defaultPeakThroughput(inputs);
  const peak = inputs.flows.peakThroughput;
  const setFlow = <K extends keyof typeof inputs.flows>(key: K, value: (typeof inputs.flows)[K]) =>
    update((d) => ({ ...d, flows: { ...d.flows, [key]: value } }));

  const { A, B } = result.scenarios;
  const rows = [
    { label: t('flows.productsPerDay'), a: A.productsPerDay, b: B.productsPerDay },
    { label: t('flows.productsPerHour'), a: A.productsPerHour, b: B.productsPerHour },
    { label: t('flows.binsPerHour'), a: A.binsPerHour, b: B.binsPerHour },
    { label: `${t('flow.standard')} / h`, a: A.categoryThroughput.standard, b: B.categoryThroughput.standard },
    { label: `${t('flow.fragile')} / h`, a: A.categoryThroughput.fragile, b: B.categoryThroughput.fragile },
    { label: `${inputs.volumes.mix.specificLabel || t('flow.specific')} / h`, a: A.categoryThroughput.specific, b: B.categoryThroughput.specific },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('flows.title')}</h2>
        <p className="mt-1 text-slate-600">{t('flows.intro')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <NumberField
            label={t('flows.peak')}
            value={peak ?? Math.round(computedPeak)}
            suffix={t('unit.perHour')}
            onChange={(x) => setFlow('peakThroughput', x)}
            hint={
              <span className="flex flex-wrap items-center gap-x-3">
                {t('flows.peakHint', { value: f.integer(computedPeak) })}
                {peak !== null && (
                  <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setFlow('peakThroughput', null)}>
                    {t('flows.peakReset')}
                  </button>
                )}
              </span>
            }
          />
        </div>
        <NumberField label={t('flows.outputs')} hint={t('flows.outputsHint')} value={inputs.flows.outputsRequired} onChange={(x) => setFlow('outputsRequired', x ?? 0)} />
        <NumberField label={t('flows.binsPerOrder')} hint={t('flows.binsPerOrderHint')} value={inputs.flows.binsPerOrder} onChange={(x) => setFlow('binsPerOrder', x ?? 0)} />
      </div>

      <section className="card overflow-hidden">
        <h3 className="border-b border-slate-200 px-5 py-3 text-lg font-semibold text-slate-900">{t('flows.derivedTitle')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-5 py-2 font-medium" />
              <th className="px-5 py-2 text-right font-medium">{t('flows.derivedCurrent')}</th>
              <th className="px-5 py-2 text-right font-medium">{t('flows.derivedFuture')}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <td className="px-5 py-2 text-slate-700">{r.label}</td>
                <td className="px-5 py-2 text-right text-slate-900">{f.integer(r.a)}</td>
                <td className="px-5 py-2 text-right font-semibold text-slate-900">{f.integer(r.b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
