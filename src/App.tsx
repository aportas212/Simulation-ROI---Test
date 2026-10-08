import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_CLIENT, createDefaultInputs } from './config/defaults';
import { findMachine } from './config/machines';
import { runSimulation } from './engine';
import type { SimulationInputs } from './engine/types';
import { useI18n } from './i18n';
import { listLeads, loadDraft, saveDraft } from './lib/storage';
import { Alerts } from './components/Alerts';
import { LivePreview } from './components/LivePreview';
import { LeadsModal, SavedSimulationsModal } from './components/SavedPanel';
import { Stepper } from './components/Stepper';
import { Logo, Modal } from './components/ui';
import { StepContact, validateClient } from './components/form/StepContact';
import { StepFlows } from './components/form/StepFlows';
import { StepMachine } from './components/form/StepMachine';
import { StepStaffing } from './components/form/StepStaffing';
import { StepVolumes } from './components/form/StepVolumes';
import type { StepProps } from './components/form/types';
import { ResultsPage } from './components/results/ResultsPage';

/** Fusionne une saisie stockée avec les valeurs par défaut (robuste aux évolutions de structure). */
function hydrate(stored: SimulationInputs | null): SimulationInputs {
  const d = createDefaultInputs();
  if (!stored || typeof stored !== 'object') return d;
  return {
    client: { ...EMPTY_CLIENT, ...stored.client },
    volumes: { ...d.volumes, ...stored.volumes, mix: { ...d.volumes.mix, ...stored.volumes?.mix } },
    flows: { ...d.flows, ...stored.flows },
    staffing: {
      ...d.staffing,
      ...stored.staffing,
      posts: Array.isArray(stored.staffing?.posts) && stored.staffing.posts.length ? stored.staffing.posts : d.staffing.posts,
    },
    machineId: findMachine(stored.machineId ?? d.machineId).id,
    machineQuantity: stored.machineQuantity ?? d.machineQuantity,
    machineCapex: stored.machineCapex ?? null,
  };
}

// L'étape 0 (coordonnées) est rendue à part : elle reçoit l'affichage des erreurs de saisie.
const DATA_STEPS: ((p: StepProps) => JSX.Element)[] = [StepVolumes, StepFlows, StepStaffing, StepMachine];

export default function App() {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<SimulationInputs>(() => hydrate(loadDraft()));
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'form' | 'results'>('form');
  const [modal, setModal] = useState<'saved' | 'leads' | 'confirmNew' | null>(null);
  const [leadCount, setLeadCount] = useState(() => listLeads().length);
  const [showContactErrors, setShowContactErrors] = useState(false);

  useEffect(() => saveDraft(inputs), [inputs]);
  // Retour en haut à chaque changement d'étape. scrollIntoView remonte aussi les conteneurs parents
  // (utile quand l'application est intégrée dans une page ou un visualiseur).
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      topRef.current?.scrollIntoView({ block: 'start' });
      window.scrollTo(0, 0);
    } catch {
      /* défilement indisponible : ignoré */
    }
  }, [step, view]);

  const update = useCallback((fn: (d: SimulationInputs) => SimulationInputs) => setInputs((prev) => fn(prev)), []);
  const machine = findMachine(inputs.machineId);
  const result = useMemo(() => runSimulation(inputs, machine), [inputs, machine]);

  const steps = [t('steps.contact'), t('steps.volumes'), t('steps.flows'), t('steps.staffing'), t('steps.machine')];
  const DataStep = step > 0 ? DATA_STEPS[step - 1] : null;
  const isLast = step === steps.length - 1;
  // Contrôles affichés sous l'étape concernée (ceux de la machine sont dans l'étape « Solution »)
  const stepAlerts =
    step === 1 ? result.alerts.filter((a) => a.code === 'categoryFlowMismatch' || a.code === 'noVolume') : [];

  /** Change d'étape ; on ne quitte la page coordonnées que si elle est complète. */
  const goTo = (target: number) => {
    if (step === 0 && target > 0 && Object.keys(validateClient(inputs.client)).length > 0) {
      setShowContactErrors(true);
      return;
    }
    setStep(target);
  };

  return (
    <div className="min-h-screen bg-white">
      <div ref={topRef} aria-hidden />
      <header className="no-print sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Logo />
            <div className="hidden border-l border-slate-200 pl-4 lg:block">
              <p className="text-sm font-semibold text-slate-900">{t('app.title')}</p>
              <p className="text-xs text-slate-500">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {leadCount > 0 && (
              <button className="btn-ghost hidden sm:inline-flex" onClick={() => setModal('leads')}>
                {t('app.leads', { count: leadCount })}
              </button>
            )}
            <button className="btn-ghost" onClick={() => setModal('saved')}>{t('app.saved')}</button>
            <button
              className="btn-secondary"
              onClick={() => setModal('confirmNew')}
            >
              {t('app.new')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {view === 'form' ? (
          <>
            <div className="mb-8">
              <Stepper steps={steps} current={step} onSelect={goTo} />
            </div>
            <div className={`grid gap-8 ${step > 0 ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : 'max-w-3xl'}`}>
              <div className="min-w-0">
                {DataStep ? (
                  <DataStep inputs={inputs} update={update} result={result} />
                ) : (
                  <StepContact inputs={inputs} update={update} result={result} showErrors={showContactErrors} />
                )}
                {stepAlerts.length > 0 && (
                  <div className="mt-6">
                    <Alerts alerts={stepAlerts} />
                  </div>
                )}
                <div className="mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <button className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                    ← {t('nav.previous')}
                  </button>
                  {isLast ? (
                    <button className="btn-primary px-6 text-base" onClick={() => setView('results')}>
                      {t('nav.results')} →
                    </button>
                  ) : (
                    <button className="btn-primary px-6" onClick={() => goTo(step + 1)}>
                      {t('nav.next')} →
                    </button>
                  )}
                </div>
              </div>
              {step > 0 && (
                <div className="hidden lg:block">
                  <LivePreview result={result} />
                </div>
              )}
            </div>
          </>
        ) : (
          <ResultsPage
            inputs={inputs}
            result={result}
            onEdit={() => setView('form')}
            onLeadSaved={() => setLeadCount(listLeads().length)}
          />
        )}
      </main>

      {modal === 'saved' && (
        <SavedSimulationsModal
          inputs={inputs}
          onClose={() => setModal(null)}
          onLoad={(loaded) => {
            setInputs(hydrate(loaded));
            setModal(null);
            setStep(0);
            setView('form');
          }}
        />
      )}
      {modal === 'leads' && <LeadsModal onClose={() => setModal(null)} />}
      {modal === 'confirmNew' && (
        <Modal title={t('app.new')} onClose={() => setModal(null)}>
          <p className="text-slate-700">{t('app.confirmNew')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setModal(null)}>{t('lead.cancel')}</button>
            <button
              className="btn-primary"
              onClick={() => {
                setInputs(createDefaultInputs());
                setShowContactErrors(false);
                setStep(0);
                setView('form');
                setModal(null);
              }}
            >
              {t('app.new')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
