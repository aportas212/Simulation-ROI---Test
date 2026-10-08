import { useI18n } from '../i18n';

export function Stepper({ steps, current, onSelect }: { steps: string[]; current: number; onSelect: (i: number) => void }) {
  const { t } = useI18n();
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <nav aria-label={t('steps.progress', { current: current + 1, total: steps.length })}>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">{steps[current]}</span>
        <span className="tabular-nums text-slate-500">{t('steps.progress', { current: current + 1, total: steps.length })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className="group flex w-full items-center gap-2 text-left"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    state === 'current'
                      ? 'bg-accent text-white'
                      : state === 'done'
                        ? 'bg-accent-soft text-accent-dark'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span className={`hidden truncate text-sm md:block ${state === 'current' ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
