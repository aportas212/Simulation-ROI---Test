import { useRef, useState, type ReactNode } from 'react';
import type { ScenarioKey, SimulationInputs, SimulationResult } from '../../engine/types';
import { useI18n, type TFunction } from '../../i18n';
import type { Formatters } from '../../lib/format';
import type { SaveOutcome } from '../../lib/download';
import { Alerts } from '../Alerts';
import { Logo, useFormatters } from '../ui';
import { ChartLegend, CumulativeChart, HeadcountChart, useScenarioColors } from './charts';
import { LeadModal } from './LeadModal';

interface Props {
  inputs: SimulationInputs;
  result: SimulationResult;
  onEdit: () => void;
  onLeadSaved: () => void;
}

/** Libellé d'horizon généré à partir du paramètre (jamais écrit en dur). */
export function horizonLabel(t: TFunction, f: Formatters, years: number) {
  return `${f.number(years)} ${t('unit.years')}`;
}

export function buildSynthesis(t: TFunction, f: Formatters, inputs: SimulationInputs, result: SimulationResult) {
  const machine = result.machineQuantity > 1 ? `${result.machineQuantity} × ${result.machine.name}` : result.machine.name;
  const params = {
    machine,
    orders: f.integer(inputs.volumes.ordersPerDayFuture),
    operators: f.number(result.roi.operatorsSaved),
    savings: f.euro(result.roi.annualSavings),
    months: f.number(result.roi.paybackMonths ?? 0),
  };
  return result.roi.profitable ? t('results.synthesis', params) : t('results.synthesisNotProfitable', params);
}

function Kpi({ label, value, sub, highlight = false, negative = false }: { label: string; value: string; sub?: ReactNode; highlight?: boolean; negative?: boolean }) {
  return (
    <div className={`avoid-break card flex flex-col p-5 ${highlight ? 'border-accent/40 bg-accent-soft/50' : ''}`}>
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-2 font-extrabold leading-tight tracking-tight tabular-nums ${
          negative ? 'text-xl text-red-700 sm:text-2xl' : 'text-3xl text-slate-900 sm:text-4xl'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-auto pt-2 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

function Section({ title, desc, children, className = '' }: { title: string; desc?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`avoid-break card p-5 sm:p-6 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ResultsPage({ inputs, result, onEdit, onLeadSaved }: Props) {
  const { t } = useI18n();
  const f = useFormatters();
  const colors = useScenarioColors();
  const printRef = useRef<HTMLDivElement>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const { roi, scenarios, machine } = result;
  const horizon = horizonLabel(t, f, inputs.staffing.horizonYears);
  const today = f.date(new Date());

  const [pdfState, setPdfState] = useState<'idle' | 'busy' | SaveOutcome>('idle');
  const handlePdf = async () => {
    setPdfState('busy');
    try {
      // Chargé à la demande : jsPDF n'alourdit pas le premier affichage
      const { downloadRoiReport } = await import('../../pdf/roiReport');
      setPdfState(await downloadRoiReport({ inputs, result, t, f }));
    } catch {
      setPdfState('failed');
    }
  };
  const pdfButton = (primary = false) => (
    <button className={primary ? 'btn-primary px-6 text-base' : 'btn-secondary'} onClick={handlePdf} disabled={pdfState === 'busy'}>
      ⤓ {t(pdfState === 'busy' ? 'results.pdf.generating' : 'results.pdf.download')}
    </button>
  );
  const pdfStatus =
    pdfState === 'saved' || pdfState === 'declined' || pdfState === 'failed' ? (
      <p className={`text-sm font-medium ${pdfState === 'saved' ? 'text-emerald-700' : pdfState === 'failed' ? 'text-red-700' : 'text-slate-500'}`} role="status">
        {pdfState === 'saved' ? '✓ ' : ''}
        {t(`results.pdf.${pdfState}`)}
      </p>
    ) : null;

  const machineLabel = result.machineQuantity > 1 ? `${result.machineQuantity} × ${machine.name}` : machine.name;

  return (
    <div>
      <div ref={printRef} className="print-root space-y-6">
        {/* En-tête PDF */}
        <div className="print-only mb-2 border-b-2 border-accent pb-3">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="text-sm font-semibold text-slate-600">{t('results.print.header', { date: today })}</span>
          </div>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {inputs.client.company && <p className="eyebrow mb-1">{t('results.preparedFor', { company: inputs.client.company })}</p>}
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('results.title')}</h2>
            <p className="mt-1 text-slate-600">
              {t('results.subtitle', { machine: machineLabel, orders: f.integer(inputs.volumes.ordersPerDayFuture), horizon })}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={onEdit}>← {t('results.actions.edit')}</button>
            {pdfButton()}
            <button className="btn-primary" onClick={() => setLeadOpen(true)}>{t('results.actions.study')}</button>
          </div>
        </header>
        {pdfStatus && <div className="no-print -mt-3 flex justify-end">{pdfStatus}</div>}

        {/* 4 chiffres clés */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <Kpi
            highlight
            label={t('results.kpi.savings')}
            value={f.euroCompact(roi.annualSavings)}
            sub={t('results.kpi.vsManual')}
          />
          <Kpi
            label={t('results.kpi.payback')}
            value={roi.paybackMonths !== null ? t('results.kpi.paybackValue', { months: f.number(roi.paybackMonths) }) : t('results.notProfitable')}
            negative={roi.paybackMonths === null}
            sub={t('results.kpi.capexOf', { capex: f.euroCompact(roi.capex) })}
          />
          <Kpi
            label={t('results.kpi.gain', { horizon })}
            value={f.euroCompact(roi.cumulativeGain)}
            sub={roi.roiPercent !== null ? t('results.kpi.roi', { value: f.percent(roi.roiPercent) }) : undefined}
          />
          <Kpi
            label={t('results.kpi.operators')}
            value={f.number(roi.operatorsSaved)}
            sub={t('results.kpi.perShift', {
              value: f.number(scenarios.B.totals.perShift - scenarios.C.totals.perShift),
            })}
          />
        </div>

        <p className="avoid-break rounded-xl bg-slate-900 px-5 py-4 text-base font-medium leading-relaxed text-white sm:text-lg">
          {buildSynthesis(t, f, inputs, result)}
        </p>

        <Alerts alerts={result.alerts} />

        {/* Coûts des 3 scénarios */}
        <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
          {(['A', 'B', 'C'] as ScenarioKey[]).map((k) => {
            const s = scenarios[k];
            const total = s.totals.annualCost + (k === 'C' ? roi.opexYear : 0);
            return (
              <div key={k} className="avoid-break card relative overflow-hidden p-5">
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: colors[k] }} />
                <p className="eyebrow">{t(k === 'A' ? 'results.costs.current' : k === 'B' ? 'results.costs.futureManual' : 'results.costs.futureIsitec')}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{t('preview.perYear', { value: f.euroCompact(total) })}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t('results.costs.headcount', { value: f.number(s.totals.perDay) })}
                  {k === 'C' && roi.opexYear > 0 && <> · {t('results.costs.opexIncluded', { opex: f.euroCompact(roi.opexYear) })}</>}
                </p>
              </div>
            );
          })}
        </div>

        {/* Graphiques */}
        <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
          <Section title={t('results.chart.headcount')} desc={t('results.chart.headcountDesc', { shifts: f.number(inputs.volumes.shiftsPerDay) })}>
            <HeadcountChart result={result} />
          </Section>
          <Section title={t('results.chart.cumulative', { horizon })} desc={t('results.chart.cumulativeDesc')}>
            <ChartLegend items={[{ color: colors.B, label: t('results.scenario.B') }, { color: colors.C, label: t('results.scenario.C') }]} />
            <div className="mt-2">
              <CumulativeChart result={result} />
            </div>
          </Section>
        </div>

        {/* Ce que la machine vous apporte */}
        <Section title={t('results.benefits.title')}>
          <Benefits result={result} />
        </Section>

        {/* Tableau détaillé */}
        <div className="page-break" />
        <Section title={t('results.table.title')}>
          <DetailTable result={result} />
        </Section>

        {/* Hypothèses */}
        <section className="avoid-break card p-5 sm:p-6">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowAssumptions((v) => !v)}
            aria-expanded={showAssumptions}
          >
            <h3 className="text-lg font-bold text-slate-900">{t('results.assumptions.title')}</h3>
            <span className="no-print text-sm font-semibold text-accent">
              {showAssumptions ? t('results.assumptions.hide') : t('results.assumptions.show')} {showAssumptions ? '▲' : '▼'}
            </span>
          </button>
          <div className={`${showAssumptions ? '' : 'hidden'} mt-4 print:block`}>
            <Assumptions inputs={inputs} result={result} />
          </div>
        </section>

        <p className="print-only text-[10px] text-slate-500">{t('results.print.disclaimer')}</p>
      </div>

      {/* Fin de parcours : téléchargement de la synthèse */}
      <section className="no-print mt-8 overflow-hidden rounded-2xl bg-[#0B2545] text-white">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">
              {inputs.client.company ? t('results.preparedFor', { company: inputs.client.company }) : t('pdf.docTitle')}
            </p>
            <h3 className="mt-1 text-2xl font-bold">{t('results.cta.title')}</h3>
            <p className="mt-2 text-sm text-slate-300">{t('results.cta.text')}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <button
              className="btn bg-white px-6 text-base text-[#0B2545] hover:bg-sky-50"
              onClick={handlePdf}
              disabled={pdfState === 'busy'}
            >
              ⤓ {t(pdfState === 'busy' ? 'results.pdf.generating' : 'results.pdf.download')}
            </button>
            {pdfStatus && <div className="[&_p]:text-sky-100">{pdfStatus}</div>}
          </div>
        </div>
      </section>

      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-secondary" onClick={onEdit}>← {t('results.actions.edit')}</button>
        <button className="btn-primary" onClick={() => setLeadOpen(true)}>{t('results.actions.study')}</button>
      </div>

      {leadOpen && (
        <LeadModal
          inputs={inputs}
          result={result}
          onClose={() => setLeadOpen(false)}
          onSaved={onLeadSaved}
        />
      )}
    </div>
  );
}

function Benefits({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const { capacity, scenarios } = result;
  const utilization = capacity.utilization * 100;
  const over = utilization > 100;
  const outputsOk = capacity.outputsAvailable >= capacity.outputsRequired;
  const changed = scenarios.C.posts
    .map((p, i) => ({ c: p, b: scenarios.B.posts[i] }))
    // Seuls les postes réellement supprimés ou allégés (effectif en baisse) sont mis en avant
    .filter(({ c, b }) => c.status === 'removed' || (c.status === 'modified' && c.perDay < b.perDay - 1e-9));

  return (
    <div className="grid gap-5 md:grid-cols-3 print:grid-cols-3">
      <div>
        <p className="eyebrow">{t('results.benefits.capacity')}</p>
        <p className={`mt-1 text-3xl font-extrabold tabular-nums ${over ? 'text-red-700' : 'text-slate-900'}`}>{f.percent(utilization)}</p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${over ? 'bg-red-600' : 'bg-accent'}`} style={{ width: `${Math.min(100, utilization)}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t('results.benefits.capacityDetail', { peak: f.integer(capacity.peakThroughput), max: f.integer(capacity.installedThroughput) })}
        </p>
        <p className={`mt-1 text-sm font-semibold ${over ? 'text-red-700' : 'text-emerald-700'}`}>
          {over
            ? `⚠ ${t('results.benefits.overload', { machinesNeeded: capacity.machinesNeeded })}`
            : `✓ ${t('results.benefits.headroom', { value: f.percent(100 - utilization) })}`}
        </p>
      </div>
      <div>
        <p className="eyebrow">{t('results.benefits.outputs')}</p>
        <p className={`mt-1 text-3xl font-extrabold tabular-nums ${outputsOk ? 'text-slate-900' : 'text-red-700'}`}>
          {f.integer(capacity.outputsAvailable)} <span className="text-lg font-semibold text-slate-400">/ {f.integer(capacity.outputsRequired)}</span>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {t('results.benefits.outputsDetail', { available: f.integer(capacity.outputsAvailable), required: f.integer(capacity.outputsRequired) })}
        </p>
        <p className={`mt-1 text-sm font-semibold ${outputsOk ? 'text-emerald-700' : 'text-red-700'}`}>
          {outputsOk ? `✓ ${t('results.benefits.outputsOk')}` : `⚠ ${t('results.benefits.outputsKo')}`}
        </p>
      </div>
      <div>
        <p className="eyebrow">{t('results.benefits.posts')}</p>
        {changed.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t('results.benefits.noPosts')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {changed.map(({ c, b }) => (
              <li key={c.id} className="flex gap-2">
                <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${c.status === 'removed' ? 'bg-emerald-600' : 'bg-accent'}`} />
                <span>
                  {c.status === 'removed'
                    ? t('results.benefits.postRemoved', { label: c.label, before: f.number(b.perDay) })
                    : t('results.benefits.postModified', { label: c.label, before: f.number(b.perDay), after: f.number(c.perDay) })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="eyebrow mt-4">{t('results.benefits.reliability')}</p>
        <p className="mt-1 text-sm text-slate-600">{t('results.benefits.reliabilityText')}</p>
      </div>
    </div>
  );
}

function DetailTable({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const colors = useScenarioColors();
  const keys: ScenarioKey[] = ['A', 'B', 'C'];
  const metrics = [
    { key: 'perShift' as const, label: t('results.table.perShift'), fmt: (v: number) => f.number(v) },
    { key: 'perDay' as const, label: t('results.table.perDay'), fmt: (v: number) => f.number(v) },
    { key: 'manDaysYear' as const, label: t('results.table.manDays'), fmt: (v: number) => f.integer(v) },
    { key: 'annualCost' as const, label: t('results.table.annualCost'), fmt: (v: number) => f.euroCompact(v) },
  ];
  const posts = result.scenarios.A.posts;

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6 print:overflow-visible">
      <table className="w-full min-w-[760px] text-sm tabular-nums print:min-w-0 print:text-[9px]">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th rowSpan={2} className="border-b border-slate-200 px-5 pb-2 text-left align-bottom font-semibold sm:px-6">
              {t('results.table.post')}
            </th>
            {metrics.map((m) => (
              <th key={m.key} colSpan={3} className="border-b border-l border-slate-200 px-2 pb-1 text-center font-semibold">
                {m.label}
              </th>
            ))}
          </tr>
          <tr className="text-[11px] text-slate-500">
            {metrics.map((m) =>
              keys.map((k) => (
                <th key={`${m.key}-${k}`} className={`border-b border-slate-200 px-2 pb-2 pt-1 text-right font-semibold ${k === 'A' ? 'border-l' : ''}`}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: colors[k] }} />
                  {k}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {posts.map((p, i) => {
            const c = result.scenarios.C.posts[i];
            const b = result.scenarios.B.posts[i];
            const tag = c.status === 'removed' ? 'removed' : c.status === 'modified' && c.perDay < b.perDay - 1e-9 ? 'modified' : null;
            return (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-5 py-2 text-slate-800 sm:px-6">
                  {p.label}
                  {tag && (
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tag === 'removed' ? 'bg-emerald-100 text-emerald-800' : 'bg-accent-soft text-accent-dark'}`}>
                      {t(tag === 'removed' ? 'results.table.removed' : 'results.table.modified')}
                    </span>
                  )}
                </td>
                {metrics.map((m) =>
                  keys.map((k) => (
                    <td key={`${m.key}-${k}`} className={`px-2 py-2 text-right ${k === 'A' ? 'border-l border-slate-100' : ''} ${k === 'C' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {m.fmt(result.scenarios[k].posts[i][m.key])}
                    </td>
                  )),
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-bold text-slate-900">
            <td className="px-5 py-2.5 sm:px-6">{t('results.table.total')}</td>
            {metrics.map((m) =>
              keys.map((k) => (
                <td key={`${m.key}-${k}`} className={`px-2 py-2.5 text-right ${k === 'A' ? 'border-l border-slate-200' : ''}`}>
                  {m.fmt(result.scenarios[k].totals[m.key])}
                </td>
              )),
            )}
          </tr>
        </tfoot>
      </table>
      <p className="mt-3 px-5 text-xs text-slate-500 sm:px-6">
        A = {t('results.scenario.A')} · B = {t('results.scenario.B')} · C = {t('results.scenario.C')}
      </p>
    </div>
  );
}

function Assumptions({ inputs, result }: { inputs: SimulationInputs; result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const v = inputs.volumes;
  const rows: [string, string][] = [
    [t('results.assumptions.ordersCurrent'), f.integer(v.ordersPerDayCurrent)],
    [t('results.assumptions.ordersFuture'), f.integer(v.ordersPerDayFuture)],
    [t('results.assumptions.productsPerOrder'), f.number(v.productsPerOrder)],
    [t('results.assumptions.hours'), `${f.number(v.hoursPerDay)} h`],
    [t('results.assumptions.shifts'), f.number(v.shiftsPerDay)],
    [t('results.assumptions.days'), f.integer(v.daysPerYear)],
    [
      t('results.assumptions.mix'),
      t('results.assumptions.mixValue', {
        standard: f.number(v.mix.standard),
        fragile: f.number(v.mix.fragile),
        specific: f.number(v.mix.specific),
        specificLabel: v.mix.specificLabel || t('flow.specific').toLowerCase(),
      }),
    ],
    [t('results.assumptions.binsPerOrder'), f.number(inputs.flows.binsPerOrder)],
    [t('results.assumptions.peak'), `${f.integer(result.capacity.peakThroughput)} ${t('unit.pieces')}${t('unit.perHour')}`],
    [t('results.assumptions.outputs'), f.integer(inputs.flows.outputsRequired)],
    [t('results.assumptions.cost'), f.euro(inputs.staffing.costPerOperatorYear)],
    [t('results.assumptions.horizon'), horizonLabel(t, f, inputs.staffing.horizonYears)],
    [
      t('results.assumptions.staffingMode'),
      t(inputs.staffing.mode === 'declared' ? 'results.assumptions.staffingDeclared' : 'results.assumptions.staffingComputed'),
    ],
    [
      t('results.assumptions.machine'),
      t('results.assumptions.machineValue', {
        quantity: result.machineQuantity,
        machine: result.machine.name,
        capex: f.euro(result.roi.capex),
        opex: t('preview.perYear', { value: f.euro(result.roi.opexYear) }),
      }),
    ],
  ];
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium tabular-nums text-slate-900">{val}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-3">{t('results.table.post')}</th>
              <th className="px-3 py-1.5 text-right">{t('results.scenario.B')}</th>
              <th className="px-3 py-1.5 text-right">{t('results.scenario.C')}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.scenarios.B.posts.map((p, i) => {
              const c = result.scenarios.C.posts[i];
              const unit = p.flow === 'management' ? t('staffing.colProductivityMgmt').toLowerCase() : `${t(`unit.${p.unit}`)}${t('unit.perHour')}`;
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700">{p.label}</td>
                  <td className="px-3 py-1.5 text-right">{f.number(p.productivity)} {unit}</td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {c.status === 'removed' ? t('results.table.removed') : `${f.number(c.productivity)} ${unit}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {t('results.assumptions.method', {
          shifts: f.number(inputs.volumes.shiftsPerDay),
          cost: t('preview.perYear', { value: f.euro(inputs.staffing.costPerOperatorYear) }),
        })}
      </p>
    </div>
  );
}
