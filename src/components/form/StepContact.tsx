import { useId } from 'react';
import type { ClientInfo, ClientSector } from '../../engine/types';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/fr';
import type { ContactStepProps } from './types';

type RequiredField = 'company' | 'contactName' | 'role';
const REQUIRED: RequiredField[] = ['company', 'contactName', 'role'];
const SECTORS: Exclude<ClientSector, ''>[] = ['retail', 'ecommerce', '3pl', 'industry', 'other'];

/** Erreurs de la page coordonnées (clé de traduction par champ). Vide = page valide. */
export function validateClient(client: ClientInfo): Partial<Record<keyof ClientInfo, TranslationKey>> {
  const errors: Partial<Record<keyof ClientInfo, TranslationKey>> = {};
  for (const k of REQUIRED) if (!client[k].trim()) errors[k] = 'contact.required';
  if (client.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) errors.email = 'contact.invalidEmail';
  return errors;
}

export function StepContact({ inputs, update, showErrors }: ContactStepProps) {
  const { t } = useI18n();
  const uid = useId();
  const client = inputs.client;
  const errors = showErrors ? validateClient(client) : {};
  const set = (key: keyof ClientInfo, value: string) =>
    update((d) => ({ ...d, client: { ...d.client, [key]: value } }));

  const field = (
    key: Exclude<keyof ClientInfo, 'sector'>,
    opts: { type?: string; autoComplete?: string; placeholder?: string; list?: string; optional?: boolean; wide?: boolean },
  ) => {
    const id = `${uid}-${key}`;
    const err = errors[key];
    return (
      <div className={opts.wide ? 'sm:col-span-2' : ''}>
        <label htmlFor={id} className="label">
          {t(`contact.${key}`)}
          {opts.optional ? (
            <span className="ml-1 font-normal text-slate-400">({t('contact.optional')})</span>
          ) : (
            <span className="text-red-600"> *</span>
          )}
        </label>
        <input
          id={id}
          type={opts.type ?? 'text'}
          className={`input ${err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
          value={client[key]}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          list={opts.list}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          onChange={(e) => set(key, e.target.value)}
        />
        {err && (
          <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">
            {t(err)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">{t('contact.title')}</h2>
        <p className="mt-1 max-w-2xl text-slate-600">{t('contact.intro')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {field('company', { autoComplete: 'organization', placeholder: t('contact.companyPlaceholder'), wide: true })}
        {field('contactName', { autoComplete: 'name', placeholder: t('contact.contactNamePlaceholder') })}
        {field('role', { autoComplete: 'organization-title', placeholder: t('contact.rolePlaceholder'), list: `${uid}-roles` })}
        {field('email', { type: 'email', autoComplete: 'email', optional: true })}
        {field('phone', { type: 'tel', autoComplete: 'tel', optional: true })}
        <datalist id={`${uid}-roles`}>
          {t('contact.roles').split('|').map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <fieldset>
        <legend className="label">
          {t('contact.sector')} <span className="font-normal text-slate-400">({t('contact.optional')})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => {
            const active = client.sector === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => set('sector', active ? '' : s)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'border-accent bg-accent text-white' : 'border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                {t(`contact.sector.${s}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="text-xs text-slate-500">{t('contact.privacy')}</p>
    </div>
  );
}
