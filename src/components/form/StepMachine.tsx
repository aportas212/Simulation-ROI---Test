import { useState } from 'react';
import { MACHINES, PACKING_POST } from '../../config/machines';
import type { Machine } from '../../engine/types';
import { useI18n } from '../../i18n';
import { Alerts } from '../Alerts';
import { NumberField, useFormatters } from '../ui';
import type { StepProps } from './types';

type Filter = 'all' | Machine['type'];

export function StepMachine({ inputs, update, result }: StepProps) {
  const { t } = useI18n();
  const f = useFormatters();
  const [filter, setFilter] = useState<Filter>(() => MACHINES.find((m) => m.id === inputs.machineId)?.type ?? 'all');
  const [notice, setNotice] = useState<string | null>(null);
  const selected = MACHINES.find((m) => m.id === inputs.machineId) ?? MACHINES[0];
  const machineAlerts = result.alerts.filter(
    (a) => a.code === 'capacityExceeded' || a.code === 'outputsExceeded' || a.code === 'priceOnRequest',
  );
  const labelOf = (id: string) => inputs.staffing.posts.find((p) => p.id === id)?.label ?? id;

  const price = (m: Machine) => (m.capex === null ? t('machine.onRequest') : t('machine.priceHT', { value: f.euro(m.capex) }));
  const cadence = (m: Machine) => t(`machine.perHour.${m.throughputUnit}`, { value: f.integer(m.maxThroughput) });

  const select = (m: Machine) => {
    setNotice(null);
    update((d) => {
      let posts = d.staffing.posts;
      // Une machine de packing agit sur le poste « Emballage et étiquetage » : on l'ajoute s'il manque
      if (m.type === 'packing' && !posts.some((p) => p.id === PACKING_POST.id)) {
        posts = [...posts.filter((p) => p.flow !== 'management'), { ...PACKING_POST }, ...posts.filter((p) => p.flow === 'management')];
        setNotice(t('machine.packingPostAdded', { label: PACKING_POST.label, productivity: f.integer(PACKING_POST.productivity) }));
      }
      return { ...d, machineId: m.id, machineCapex: null, staffing: { ...d.staffing, posts } };
    });
  };

  const filters: Filter[] = ['all', 'tri', 'packing'];
  const visible = MACHINES.filter((m) => filter === 'all' || m.type === filter);
  const capexValue = inputs.machineCapex ?? selected.capex;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('machine.title')}</h2>
        <p className="mt-1 text-slate-600">{t('machine.intro')}</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        {filters.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === key ? 'border-accent bg-accent text-white' : 'border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            {t(`machine.filter.${key}`)}
            <span className="ml-1.5 opacity-70">{key === 'all' ? MACHINES.length : MACHINES.filter((m) => m.type === key).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={t('machine.title')}>
        {visible.map((m) => {
          const isSelected = m.id === selected.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => select(m)}
              className={`group flex flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition-all ${
                isSelected ? 'border-accent shadow-lg ring-4 ring-accent/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="relative flex h-40 items-center justify-center bg-slate-50">
                {m.image && <img src={m.image} alt={m.name} loading="lazy" className="h-full w-full object-contain p-2" />}
                <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {t(`machine.type.${m.type}`)}
                </span>
                {isSelected && (
                  <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent shadow">
                    ✓ {t('machine.selected')}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="eyebrow">{m.family}</p>
                <h3 className="mt-0.5 text-base font-bold text-slate-900">{m.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.description}</p>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <dt className="text-slate-500">{t('machine.maxThroughput')}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{cadence(m)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('machine.outputs')}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{m.outputs === null ? '—' : f.integer(m.outputs)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('machine.capex')}</dt>
                    <dd className={`font-semibold tabular-nums ${m.capex === null ? 'text-slate-500' : 'text-accent'}`}>
                      {m.capex === null ? t('machine.onRequest') : f.euroCompact(m.capex)}
                    </dd>
                  </div>
                </dl>
              </div>
            </button>
          );
        })}
      </div>

      {notice && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
          ℹ {notice}
        </p>
      )}

      {/* Fiche détaillée de la machine retenue */}
      <section className="card overflow-hidden" aria-label={t('machine.details')}>
        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex items-center justify-center bg-slate-50 p-4">
            {selected.image && <img src={selected.image} alt={selected.name} className="max-h-72 w-full object-contain" />}
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <p className="eyebrow">{t('machine.details')} · {t(`machine.type.${selected.type}`)}</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{selected.name}</h3>
              <p className="mt-1 text-slate-600">{selected.description}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">{t('machine.capex')}</dt>
                <dd className="text-base font-bold text-accent">{price(selected)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('machine.maxThroughput')}</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900">{cadence(selected)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('machine.outputs')}</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900">
                  {selected.outputs === null ? t('machine.na') : f.integer(selected.outputs)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('machine.opex')}</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900">
                  {selected.opexYear > 0 ? t('preview.perYear', { value: f.euroCompact(selected.opexYear) }) : '—'}
                </dd>
              </div>
            </dl>

            <ul className="grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
              {selected.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>

            <dl className="grid gap-x-6 gap-y-1.5 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
              {selected.specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{t('machine.operators')}</dt>
                <dd className="text-right font-medium text-slate-900">
                  {selected.operatorsPerShift > 0
                    ? t('machine.operatorsValue', { value: f.number(selected.operatorsPerShift) })
                    : t('machine.noOperator')}
                </dd>
              </div>
              {(selected.removedPosts.length > 0 || Object.keys(selected.productivities).length > 0) && (
                <div className="flex justify-between gap-3 sm:col-span-2">
                  <dt className="text-slate-500">{selected.removedPosts.length > 0 ? t('machine.removes') : t('machine.modifies')}</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {[...selected.removedPosts, ...Object.keys(selected.productivities)].map(labelOf).join(', ')}
                  </dd>
                </div>
              )}
            </dl>

            {selected.assumptions.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-semibold">{t('machine.assumptions')}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {selected.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-400">{t('machine.source', { source: selected.source })}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField
          label={t('machine.capexLabel')}
          value={capexValue}
          allowEmpty
          suffix="€ HT"
          placeholder={selected.capex === null ? t('machine.onRequest') : undefined}
          onChange={(x) => update((d) => ({ ...d, machineCapex: x }))}
          hint={
            <span className="flex flex-wrap items-center gap-x-3">
              {selected.capex === null
                ? t('machine.capexHintOnRequest')
                : t('machine.capexHintCatalog', { value: t('machine.priceHT', { value: f.euro(selected.capex) }) })}
              {inputs.machineCapex !== null && selected.capex !== null && inputs.machineCapex !== selected.capex && (
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => update((d) => ({ ...d, machineCapex: null }))}>
                  {t('machine.capexReset')}
                </button>
              )}
            </span>
          }
        />
        <NumberField
          label={t('machine.quantity')}
          value={inputs.machineQuantity}
          min={1}
          max={20}
          onChange={(x) => update((d) => ({ ...d, machineQuantity: Math.max(1, Math.round(x ?? 1)) }))}
        />
      </div>

      <Alerts alerts={machineAlerts} />
      {result.capacity.machinesNeeded > result.machineQuantity && (
        <button
          type="button"
          className="btn-secondary -mt-4"
          onClick={() => update((d) => ({ ...d, machineQuantity: result.capacity.machinesNeeded }))}
        >
          {t('machine.applyQuantity', { n: result.capacity.machinesNeeded })}
        </button>
      )}
    </div>
  );
}
