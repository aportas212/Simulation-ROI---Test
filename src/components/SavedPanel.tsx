import { useState } from 'react';
import type { SimulationInputs } from '../engine/types';
import { useI18n } from '../i18n';
import { deleteSimulation, downloadFile, leadsToCsv, listLeads, listSimulations, saveSimulation, type SavedSimulation } from '../lib/storage';
import { Modal, useFormatters } from './ui';

export function SavedSimulationsModal({
  inputs,
  onLoad,
  onClose,
}: {
  inputs: SimulationInputs;
  onLoad: (inputs: SimulationInputs) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const f = useFormatters();
  const [items, setItems] = useState<SavedSimulation[]>(() => listSimulations());
  const [name, setName] = useState(() => t('app.saveDefaultName', { date: f.date(new Date()) }));
  const [saved, setSaved] = useState(false);

  return (
    <Modal title={t('app.saved')} onClose={onClose}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveSimulation(name.trim() || t('app.saveDefaultName', { date: f.date(new Date()) }), inputs);
          setItems(listSimulations());
          setSaved(true);
        }}
      >
        <input className="input" aria-label={t('app.saveAs')} value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        <button className="btn-primary shrink-0" type="submit">{t('app.save')}</button>
      </form>
      {saved && <p className="mt-2 text-sm font-medium text-emerald-700">✓ {t('app.savedOk')}</p>}
      <ul className="mt-5 divide-y divide-slate-100">
        {items.length === 0 && <li className="py-3 text-sm text-slate-500">{t('app.noSaved')}</li>}
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{f.date(s.savedAt)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button className="btn-secondary px-3 py-1.5" onClick={() => onLoad(s.inputs)}>{t('app.load')}</button>
              <button
                className="btn-ghost px-3 py-1.5 text-red-700"
                onClick={() => { deleteSimulation(s.id); setItems(listSimulations()); }}
              >
                {t('app.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export function LeadsModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const f = useFormatters();
  const leads = listLeads();
  return (
    <Modal title={t('lead.listTitle')} onClose={onClose} wide>
      {leads.length === 0 ? (
        <p className="text-sm text-slate-500">{t('lead.none')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">{t('lead.date')}</th>
                  <th className="py-2 pr-3">{t('lead.name')}</th>
                  <th className="py-2 pr-3">{t('lead.company')}</th>
                  <th className="py-2 pr-3">{t('lead.email')}</th>
                  <th className="py-2 pr-3">{t('lead.phone')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-500">{f.date(l.createdAt)}</td>
                    <td className="py-2 pr-3 font-medium">{l.name}</td>
                    <td className="py-2 pr-3">{l.company}</td>
                    <td className="py-2 pr-3">{l.email}</td>
                    <td className="py-2 pr-3">{l.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn-primary mt-4"
            onClick={() => downloadFile(`isitec-demandes-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(leads))}
          >
            ⤓ {t('lead.exportCsv')}
          </button>
        </>
      )}
    </Modal>
  );
}
