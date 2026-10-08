import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '../../engine/types';
import { useI18n } from '../../i18n';
import { useFormatters } from '../ui';

/** Couleurs des scénarios : A = référence atténuée, B = manuel (ambre), C = ISITEC (accent). */
export function useScenarioColors() {
  return useMemo(() => {
    let accent = '0 92 169';
    if (typeof window !== 'undefined') {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      if (v) accent = v;
    }
    return { A: '#7a8bb0', B: '#d97706', C: `rgb(${accent.split(/\s+/).join(',')})` };
  }, []);
}

const AXIS = { stroke: '#cbd5e1', tick: { fill: '#64748b', fontSize: 12 } };

function TooltipBox({ title, rows }: { title: string; rows: { color: string; label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-slate-700">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
          {r.label}
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function HeadcountChart({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const colors = useScenarioColors();
  const data = (['A', 'B', 'C'] as const).map((k) => ({
    key: k,
    name: t(`results.scenario.${k}`),
    value: result.scenarios[k].totals.perDay,
  }));
  return (
    <div className="chart-box h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 28, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={{ stroke: AXIS.stroke }} tickLine={false} tick={{ ...AXIS.tick, fill: '#334155', fontWeight: 600 }} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(payload[0].payload.name)}
                  rows={[{ color: colors[payload[0].payload.key as 'A'], label: t('results.chart.headcount'), value: f.number(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={96}>
            {data.map((d) => (
              <Cell key={d.key} fill={colors[d.key]} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v: number) => f.number(v)} style={{ fill: '#0f172a', fontWeight: 700, fontSize: 14 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeChart({ result }: { result: SimulationResult }) {
  const { t } = useI18n();
  const f = useFormatters();
  const colors = useScenarioColors();
  const { roi } = result;
  const months = roi.cumulative[roi.cumulative.length - 1]?.month ?? 12;
  const ticks = Array.from({ length: Math.floor(months / 12) + 1 }, (_, i) => i * 12);
  const breakEven =
    roi.paybackMonths !== null && roi.paybackMonths <= months
      ? {
          x: roi.paybackMonths,
          y: roi.capex + ((result.scenarios.C.totals.annualCost + roi.opexYear) * roi.paybackMonths) / 12,
        }
      : null;

  return (
    <div className="chart-box h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={roi.cumulative} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, months]}
            ticks={ticks}
            tickFormatter={(m: number) => (m === 0 ? '0' : t('results.chart.year', { year: m / 12 }))}
            axisLine={{ stroke: AXIS.stroke }}
            tickLine={false}
            tick={AXIS.tick}
          />
          <YAxis axisLine={false} tickLine={false} tick={AXIS.tick} width={64} tickFormatter={(v: number) => f.euroCompact(v)} />
          <Tooltip
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={t('results.chart.month', { month: Number(label) })}
                  rows={payload.map((p) => ({
                    color: String(p.color),
                    label: String(p.name),
                    value: f.euroCompact(Number(p.value)),
                  }))}
                />
              ) : null
            }
          />
          <Line type="linear" dataKey="manual" name={t('results.scenario.B')} stroke={colors.B} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="isitec" name={t('results.scenario.C')} stroke={colors.C} strokeWidth={2} dot={false} isAnimationActive={false} />
          {breakEven && (
            <>
              <ReferenceLine x={breakEven.x} stroke="#0f172a" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceDot
                x={breakEven.x}
                y={breakEven.y}
                r={6}
                fill="#fff"
                stroke="#0f172a"
                strokeWidth={2}
                label={{
                  value: t('results.chart.breakEven', { month: f.number(breakEven.x) }),
                  position: 'top',
                  offset: 12,
                  fill: '#0f172a',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: i.color, height: 3 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
