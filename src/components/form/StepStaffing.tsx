import { DEFAULT_POSTS } from '../../config/defaults';
import type { FlowSource, PostInput, StaffingMode } from '../../engine/types';
import { useI18n } from '../../i18n';
import { NumberField, NumberInput, useFormatters } from '../ui';
import type { StepProps } from './types';

const FLOWS: FlowSource[] = ['standard', 'fragile', 'specific', 'bins', 'management'];
const unitForFlow = (flow: FlowSource): PostInput['unit'] =>
  flow === 'bins' ? 'bins' : flow === 'management' ? 'managers' : 'pieces';
const isStandardPost = (id: string) => DEFAULT_POSTS.some((p) => p.id === id);

export function StepStaffing({ inputs, update, result }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const s = inputs.staffing;
  const declared = s.mode === 'declared';
  const computedA = result.scenarios.A.posts;

  const setStaffing = (patch: Partial<typeof s>) =>
    update((d) => ({ ...d, staffing: { ...d.staffing, ...patch } }));
  const setPost = (id: string, patch: Partial<PostInput>) =>
    update((d) => ({
      ...d,
      staffing: { ...d.staffing, posts: d.staffing.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
    }));

  const addPost = () =>
    update((d) => ({
      ...d,
      staffing: {
        ...d.staffing,
        posts: [
          ...d.staffing.posts,
          { id: `custom-${Date.now().toString(36)}`, label: t('staffing.newPost'), unit: 'pieces', flow: 'standard', productivity: 100, currentHeadcount: null },
        ],
      },
    }));

  const modes: { key: StaffingMode; label: string }[] = [
    { key: 'computed', label: t('staffing.modeComputed') },
    { key: 'declared', label: t('staffing.modeDeclared') },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('staffing.title')}</h2>
        <p className="mt-1 text-slate-600">{t('staffing.intro')}</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={s.mode === m.key}
            onClick={() => setStaffing({ mode: m.key })}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
              s.mode === m.key ? 'border-accent bg-accent-soft text-accent-dark' : 'border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            <span className={`mr-2 inline-block h-3.5 w-3.5 rounded-full border-2 align-[-2px] ${s.mode === m.key ? 'border-accent bg-accent' : 'border-slate-400'}`} />
            {m.label}
          </button>
        ))}
      </div>
      {declared && <p className="-mt-5 text-sm text-slate-500">{t('staffing.declaredHint')}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t('staffing.colPost')}</th>
              <th className="px-3 py-3 text-right">{t('staffing.colFlow')}</th>
              <th className="w-40 px-3 py-3">{t('staffing.colProductivity')}</th>
              <th className="w-36 px-3 py-3">{declared ? t('staffing.colHeadcount') : t('staffing.colComputed')}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {s.posts.map((post) => {
              const computed = computedA.find((p) => p.id === post.id);
              const isMgmt = post.flow === 'management';
              const custom = !isStandardPost(post.id);
              return (
                <tr key={post.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-4 py-2.5">
                    <input
                      className="input py-2 text-sm font-medium"
                      aria-label={t('staffing.colPost')}
                      value={post.label}
                      onChange={(e) => setPost(post.id, { label: e.target.value })}
                    />
                    {custom ? (
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                        {t('staffing.flow')}
                        <select
                          className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                          value={post.flow}
                          onChange={(e) => {
                            const flow = e.target.value as FlowSource;
                            setPost(post.id, { flow, unit: unitForFlow(flow) });
                          }}
                        >
                          {FLOWS.map((fl) => (
                            <option key={fl} value={fl}>{t(`flow.${fl}`)}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">{t(`flow.${post.flow}`)} · {t(`unit.${post.unit}`)}</p>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums text-slate-600">
                    {isMgmt ? '—' : f.integer(computed?.throughput ?? 0)}
                  </td>
                  <td className="px-3 py-2.5">
                    <NumberInput
                      ariaLabel={`${t('staffing.colProductivity')} – ${post.label}`}
                      value={post.productivity}
                      suffix={isMgmt ? undefined : `${t(`unit.${post.unit}`)}/h`}
                      onChange={(x) => setPost(post.id, { productivity: x ?? 0 })}
                    />
                    {isMgmt && <p className="mt-1 text-xs text-slate-500">{t('staffing.colProductivityMgmt')}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {declared ? (
                      <NumberInput
                        ariaLabel={`${t('staffing.colHeadcount')} – ${post.label}`}
                        value={post.currentHeadcount}
                        allowEmpty
                        placeholder={f.number(computed?.perShift ?? 0)}
                        onChange={(x) => setPost(post.id, { currentHeadcount: x })}
                      />
                    ) : (
                      <div className="py-2.5 text-right text-base font-semibold tabular-nums text-slate-900">
                        {f.number(computed?.perShift ?? 0)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    {custom && (
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-slate-400 hover:text-red-600"
                        aria-label={t('staffing.removePost')}
                        title={t('staffing.removePost')}
                        onClick={() =>
                          update((d) => ({ ...d, staffing: { ...d.staffing, posts: d.staffing.posts.filter((p) => p.id !== post.id) } }))
                        }
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900" colSpan={3}>
                {t('results.table.total')} · {t('results.costs.headcount', { value: f.number(result.scenarios.A.totals.perDay) })}
              </td>
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-slate-900">
                {f.number(result.scenarios.A.totals.perShift)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="-mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={addPost}>+ {t('staffing.addPost')}</button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setStaffing({ posts: DEFAULT_POSTS.map((p) => ({ ...p })) })}
        >
          ↺ {t('staffing.resetPosts')}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          label={t('staffing.cost')}
          value={s.costPerOperatorYear}
          suffix={t('unit.eurPerYear')}
          onChange={(x) => setStaffing({ costPerOperatorYear: x ?? 0 })}
        />
        <NumberField
          label={t('staffing.horizon')}
          value={s.horizonYears}
          min={1}
          max={20}
          suffix={t('unit.years')}
          onChange={(x) => setStaffing({ horizonYears: Math.round(x ?? 1) || 1 })}
        />
      </div>
    </div>
  );
}
