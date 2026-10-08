/** Formatage des nombres et montants selon la locale. */
export interface Formatters {
  number: (value: number, digits?: number) => string;
  integer: (value: number) => string;
  euro: (value: number) => string;
  /** Montant compact : 1,2 M€, 657 k€. */
  euroCompact: (value: number) => string;
  percent: (value: number, digits?: number) => string;
  date: (value: Date | string | number) => string;
}

export function createFormatters(locale: string): Formatters {
  const cache = new Map<string, Intl.NumberFormat>();
  const nf = (opts: Intl.NumberFormatOptions) => {
    const key = JSON.stringify(opts);
    let f = cache.get(key);
    if (!f) {
      f = new Intl.NumberFormat(locale, opts);
      cache.set(key, f);
    }
    return f;
  };
  const clean = (v: number) => (Number.isFinite(v) ? v : 0);
  return {
    number: (v, digits = 1) =>
      nf({ minimumFractionDigits: 0, maximumFractionDigits: digits }).format(clean(v)),
    integer: (v) => nf({ maximumFractionDigits: 0 }).format(clean(v)),
    euro: (v) =>
      nf({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(clean(v)),
    euroCompact: (v) => {
      const abs = Math.abs(clean(v));
      if (abs >= 1_000_000)
        return `${nf({ maximumFractionDigits: 2 }).format(clean(v) / 1_000_000)} M€`;
      if (abs >= 10_000) return `${nf({ maximumFractionDigits: 0 }).format(clean(v) / 1000)} k€`;
      return nf({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(clean(v));
    },
    percent: (v, digits = 0) =>
      `${nf({ maximumFractionDigits: digits }).format(clean(v))} %`,
    date: (v) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(v)),
  };
}
