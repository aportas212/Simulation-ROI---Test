import { useState, type FormEvent } from 'react';
import type { SimulationInputs, SimulationResult } from '../../engine/types';
import { useI18n } from '../../i18n';
import { saveLead } from '../../lib/storage';
import { Modal } from '../ui';

type Field = 'name' | 'company' | 'email' | 'phone' | 'message';
const REQUIRED: Field[] = ['name', 'company', 'email'];

export function LeadModal({
  inputs,
  result,
  onClose,
  onSaved,
}: {
  inputs: SimulationInputs;
  result: SimulationResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', company: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<Field, string>> = {};
    for (const k of REQUIRED) if (!values[k].trim()) errs[k] = t('lead.required');
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errs.email = t('lead.invalidEmail');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveLead({
      name: values.name.trim(),
      company: values.company.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      message: values.message.trim(),
      machine: result.machine.name,
      ordersPerDayFuture: inputs.volumes.ordersPerDayFuture,
      annualSavings: result.roi.annualSavings,
      paybackMonths: result.roi.paybackMonths,
    });
    setDone(true);
    onSaved();
  };

  const field = (k: Field, type = 'text') => (
    <div className={k === 'message' ? 'sm:col-span-2' : ''}>
      <label htmlFor={`lead-${k}`} className="label">
        {t(`lead.${k}`)}
        {REQUIRED.includes(k) && <span className="text-red-600"> *</span>}
      </label>
      {k === 'message' ? (
        <textarea id={`lead-${k}`} rows={4} className="input" value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
      ) : (
        <input id={`lead-${k}`} type={type} className="input" value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} aria-invalid={!!errors[k]} />
      )}
      {errors[k] && <p className="mt-1 text-xs font-medium text-red-700">{errors[k]}</p>}
    </div>
  );

  return (
    <Modal title={t('lead.title')} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">✓ {t('lead.success')}</p>
          <button className="btn-primary w-full" onClick={onClose}>{t('app.close')}</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">{t('lead.intro')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('name')}
            {field('company')}
            {field('email', 'email')}
            {field('phone', 'tel')}
            {field('message')}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>{t('lead.cancel')}</button>
            <button type="submit" className="btn-primary">{t('lead.submit')}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
