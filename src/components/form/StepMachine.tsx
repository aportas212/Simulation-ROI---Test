import { useState } from 'react';
import type { Candidate, CandidateStatus } from '../../engine/recommend';
import { useI18n } from '../../i18n';
import { paybackLabel } from '../../lib/summary';
import { Alerts } from '../Alerts';
import { NumberField, useFormatters } from '../ui';
import { MachineSheet } from './MachineSheet';
import type { StepProps } from './types';

const STATUS_STYLE: Record<CandidateStatus, string> = {
  recommended: 'bg-accent text-white',
  profitable: 'bg-emerald-50 text-emerald-800',
  onRequest: 'bg-sky-50 text-sky-800',
  notProfitable: 'bg-slate-100 text-slate-600',
  notApplicable: 'bg-slate-50 text-slate-400',
};

export function StepMachine({ inputs, update, result, candidates = [] }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const [showSheet, setShowSheet] = useState(false);
  const auto = inputs.machineSelection === 'auto';
  const machine = result.machine;
  const recommended = candidates.find((c) => c.status === 'recommended') ?? null;
  const { roi, capacity } = result;
  const postLabel = (id: string) => inputs.staffing.posts.find((p) => p.id === id)?.label ?? id;
  const machineAlerts = result.alerts.filter(
    (a) => a.code === 'capacityExceeded' || a.code === 'outputsExceeded' || a.code === 'priceOnRequest',
  );

  const choose = (c: Candidate) =>
    update((d) =>
      c.status === 'recommended'
        ? { ...d, machineSelection: 'auto', machineCapex: null }
        : { ...d, machineSelection: 'manual', machineId: c.machine.id, machineQuantity: c.quantity, machineCapex: null },
    );
  /** Toute saisie (investissement, quantité) fige la solution affichée en choix manuel. */
  const editManual = (patch: Partial<typeof inputs>) =>
    update((d) => ({
      ...d,
      machineSelection: 'manual',
      machineId: machine.id,
      machineQuantity: result.machineQuantity,
      machineCapex: inputs.machineCapex,
      ...patch,
    }));

  const quantityLabel = result.machineQuantity > 1 ? `${result.machineQuantity} × ${machine.name}` : machine.name;
  const unit = t(`unit.${capacity.unit}`);
  const changedPosts = result.scenarios.C.posts
    .map((p, i) => ({ c: p, b: result.scenarios.B.posts[i] }))
    .filter(({ c, b }) => c.status === 'removed' || (c.status === 'modified' && c.perDay < b.perDay - 1e-9));

  const reasons: string[] = [
    t('reco.reason.capacity', {
      peak: f.integer(capacity.peakThroughput),
      unit,
      utilization: f.percent(capacity.utilization * 100),
      quantity: result.machineQuantity,
    }),
  ];
  if (capacity.outputsAvailable !== null) {
    reasons.push(t('reco.reason.outputs', { available: f.integer(capacity.outputsAvailable), required: f.integer(capacity.outputsRequired) }));
  }
  if (changedPosts.length > 0) {
    reasons.push(t('reco.reason.posts', { posts: changedPosts.map(({ c }) => c.label.toLowerCase()).join(', ') }));
  }
  reasons.push(
    roi.profitable
      ? roi.paybackMonths !== null
        ? t('reco.reason.roi', { savings: f.euroCompact(roi.annualSavings), months: f.number(roi.paybackMonths) })
        : t('reco.reason.roiNoPrice', { savings: f.euroCompact(roi.annualSavings) })
      : t('reco.reason.notProfitable'),
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('reco.title')}</h2>
        <p className="mt-1 max-w-3xl text-slate-600">{t('reco.intro', { count: candidates.length })}</p>
      </header>

      {!auto && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{t('reco.manualBanner', { machine: machine.name })}</span>
          {recommended && (
            <button type="button" className="btn-secondary py-1.5" onClick={() => choose(recommended)}>
              {t('reco.backToAuto', { machine: recommended.machine.name })}
            </button>
          )}
        </div>
      )}
      {auto && !recommended && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t('reco.none')}</p>
      )}

      {/* Solution retenue */}
      <section className="card overflow-hidden border-accent/30" aria-label={t('reco.title')}>
        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="relative flex items-center justify-center bg-slate-50 p-4">
            {machine.image && <img src={machine.image} alt={machine.name} className="max-h-72 w-full object-contain" />}
            <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${auto && recommended ? 'bg-accent text-white' : 'bg-white text-slate-700 shadow'}`}>
              {auto && recommended ? `★ ${t('reco.badge')}` : t('reco.badgeManual')}
            </span>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <p className="eyebrow">{machine.family} · {t(`machine.type.${machine.type}`)}</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{quantityLabel}</h3>
              <p className="mt-1 text-slate-600">{machine.description}</p>
            </div>
            <dl className="grid grid-cols-3 gap-3 rounded-lg bg-accent-soft p-4">
              <div>
                <dt className="text-xs text-slate-600">{t('machine.capex')}</dt>
                <dd className="text-lg font-extrabold tabular-nums text-accent">
                  {roi.priceKnown ? f.euroCompact(roi.capex) : t('machine.onRequest')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-600">{t('results.kpi.savings')}</dt>
                <dd className={`text-lg font-extrabold tabular-nums ${roi.profitable ? 'text-accent' : 'text-red-700'}`}>
                  {t('preview.perYear', { value: f.euroCompact(roi.annualSavings) })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-600">{t('results.kpi.payback')}</dt>
                <dd className={`text-lg font-extrabold ${roi.profitable ? 'text-accent' : 'text-red-700'}`}>{paybackLabel(t, f, roi)}</dd>
              </div>
            </dl>
            <div>
              <p className="eyebrow">{t('reco.why')}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="mt-0.5 font-bold text-accent">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => setShowSheet((v) => !v)} aria-expanded={showSheet}>
              {showSheet ? t('reco.hideSheet') : t('reco.showSheet')} {showSheet ? '▲' : '▼'}
            </button>
            {showSheet && <MachineSheet machine={machine} postLabel={postLabel} />}
          </div>
        </div>
      </section>

      <Alerts alerts={machineAlerts} />

      {/* Ajustements : figent la solution en choix manuel */}
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          label={t('machine.capexLabel')}
          value={inputs.machineCapex ?? machine.capex}
          allowEmpty
          suffix="€ HT"
          placeholder={machine.capex === null ? t('machine.onRequest') : undefined}
          onChange={(x) => editManual({ machineCapex: x })}
          hint={
            machine.capex === null
              ? t('machine.capexHintOnRequest')
              : t('machine.capexHintCatalog', { value: t('machine.priceHT', { value: f.euro(machine.capex) }) })
          }
        />
        <NumberField
          label={t('machine.quantity')}
          value={result.machineQuantity}
          min={1}
          max={20}
          hint={auto ? t('reco.quantityAuto') : undefined}
          onChange={(x) => editManual({ machineQuantity: Math.max(1, Math.round(x ?? 1)) })}
        />
      </div>

      {/* Comparatif de toutes les solutions */}
      <section>
        <h3 className="text-lg font-bold text-slate-900">{t('reco.compareTitle')}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{t('reco.compareIntro')}</p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{t('reco.col.solution')}</th>
                <th className="px-3 py-3 text-right">{t('reco.col.quantity')}</th>
                <th className="px-3 py-3 text-right">{t('machine.capex')}</th>
                <th className="px-3 py-3 text-right">{t('results.kpi.savings')}</th>
                <th className="px-3 py-3 text-right">{t('results.kpi.payback')}</th>
                <th className="px-3 py-3">{t('reco.col.status')}</th>
                <th className="w-28 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const selected = c.machine.id === machine.id;
                const dim = c.status === 'notApplicable';
                return (
                  <tr key={c.machine.id} className={`border-b border-slate-100 last:border-0 ${selected ? 'bg-accent-soft/60' : ''} ${dim ? 'text-slate-400' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-slate-50">
                          {c.machine.image && <img src={c.machine.image} alt="" className={`max-h-10 max-w-14 object-contain ${dim ? 'opacity-40' : ''}`} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold ${dim ? '' : 'text-slate-900'}`}>{c.machine.name}</p>
                          <p className="text-xs text-slate-500">{t(`machine.perHour.${c.machine.throughputUnit}`, { value: f.integer(c.machine.maxThroughput) })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{dim ? '—' : c.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {dim ? '—' : c.result.roi.priceKnown ? f.euroCompact(c.result.roi.capex) : t('machine.onRequest')}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${dim ? '' : c.result.roi.annualSavings > 0 ? 'text-slate-900' : 'text-red-700'}`}>
                      {dim ? '—' : t('preview.perYear', { value: f.euroCompact(c.result.roi.annualSavings) })}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{dim || !c.result.roi.profitable ? '—' : paybackLabel(t, f, c.result.roi)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                        {t(`reco.status.${c.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {selected ? (
                        <span className="text-xs font-bold uppercase text-accent">✓ {t('reco.selected')}</span>
                      ) : (
                        !dim && (
                          <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => choose(c)}>
                            {t('reco.choose')}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
