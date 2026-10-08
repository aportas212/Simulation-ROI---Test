import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { createFormatters, type Formatters } from '../lib/format';
import logoUrl from '../assets/logo-isitec.png';

export function useFormatters(): Formatters {
  const { intlLocale } = useI18n();
  return useMemo(() => createFormatters(intlLocale), [intlLocale]);
}

/** Analyse une saisie numérique (accepte la virgule et les espaces de milliers). */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function display(value: number | null, locale: string): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3, useGrouping: true }).format(value);
}

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  allowEmpty?: boolean;
}

/** Champ numérique tolérant (virgule décimale, séparateurs de milliers), sans valeur NaN. */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  suffix,
  placeholder,
  id,
  className = '',
  ariaLabel,
  allowEmpty = false,
}: NumberInputProps) {
  const { intlLocale } = useI18n();
  const [text, setText] = useState(() => display(value, intlLocale));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(display(value, intlLocale));
  }, [value, intlLocale]);

  const commit = (raw: string) => {
    const n = parseNumber(raw);
    if (n === null) {
      onChange(allowEmpty ? null : 0);
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        className={`input ${suffix ? 'pr-16' : ''}`}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => {
          focused.current = false;
          setText(display(value, intlLocale));
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface FieldProps extends Omit<NumberInputProps, 'id'> {
  label: string;
  hint?: ReactNode;
}

export function NumberField({ label, hint, ...props }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <NumberInput id={id} {...props} />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return <img src={logoUrl} alt="ISITEC International" className={`h-11 w-auto select-none ${className}`} draggable={false} />;
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button className="btn-ghost -mr-2 -mt-1 px-2 py-1" onClick={onClose} aria-label={t('app.close')}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AlertBox({ tone = 'warning', children }: { tone?: 'warning' | 'info'; children: ReactNode }) {
  const styles =
    tone === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-sky-200 bg-sky-50 text-sky-900';
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`} role="status">
      <span aria-hidden className="mt-px font-bold">{tone === 'warning' ? '⚠' : 'ℹ'}</span>
      <div>{children}</div>
    </div>
  );
}
