import type { SimulationResult } from '../engine/types';
import { useI18n } from '../i18n';
import { useFormatters } from './ui';
import { useScenarioColors } from './results/charts';

export function LivePreview({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const colors = useScenarioColors();
  const { A, B, C } = result.scenarios;
  const rows = [
    { key: 'A' as const, label: t('preview.current'), cost: A.totals.annualCost, ops: A.totals.perDay },
    { key: 'B' as const, label: t('preview.futureManual'), cost: B.totals.annualCost, ops: B.totals.perDay },
    { key: 'C' as const, label: t('preview.futureIsitec'), cost: C.totals.annualCost + result.roi.opexYear, ops: C.totals.perDay },
  ];
  return (
    <aside className="card sticky top-24 p-5">
      <p className="eyebrow">{t('preview.title')}</p>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="border-l-4 pl-3" style={{ borderColor: colors[r.key] }}>
            <p className="text-xs text-slate-500">{r.label}</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">{t('preview.perYear', { value: f.euroCompact(r.cost) })}</p>
            <p className="text-xs tabular-nums text-slate-500">{t('preview.operators', { value: f.number(r.ops) })}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg bg-accent-soft px-3 py-3">
        <p className="text-xs font-semibold text-accent-dark">{t('preview.savings')}</p>
        <p className={`text-2xl font-extrabold tabular-nums ${result.roi.profitable ? 'text-accent-dark' : 'text-red-700'}`}>
          {t('preview.perYear', { value: f.euroCompact(result.roi.annualSavings) })}
        </p>
        <p className="text-xs text-slate-600">
          {result.roi.paybackMonths !== null
            ? `${t('results.kpi.payback')} : ${t('results.kpi.paybackValue', { months: f.number(result.roi.paybackMonths) })}`
            : t('results.notProfitable')}
        </p>
      </div>
    </aside>
  );
}
