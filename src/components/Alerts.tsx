import type { Alert } from '../engine/types';
import { useI18n } from '../i18n';
import { AlertBox, useFormatters } from './ui';

/** Liste des contrôles (non bloquants). */
export function Alerts({ alerts, title = true }: { alerts: Alert[]; title?: boolean }) {
  const { t } = useI18n();
  const f = useFormatters();
  if (alerts.length === 0) return null;
  const fmt = (params: Alert['params']) =>
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, typeof v === 'number' ? f.number(v, k === 'mixTotal' ? 2 : 0) : v]),
    );
  return (
    <div className="space-y-2">
      {title && <p className="eyebrow">{t('alert.title')}</p>}
      {alerts.map((a) => (
        <AlertBox key={a.code} tone={a.severity}>
          {t(`alert.${a.code}`, fmt(a.params))}
        </AlertBox>
      ))}
    </div>
  );
}
