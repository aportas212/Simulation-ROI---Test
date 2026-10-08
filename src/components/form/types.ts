import type { Candidate } from '../../engine/recommend';
import type { SimulationInputs, SimulationResult } from '../../engine/types';

export type Updater = (fn: (draft: SimulationInputs) => SimulationInputs) => void;

export interface StepProps {
  inputs: SimulationInputs;
  update: Updater;
  result: SimulationResult;
  /** Solutions du catalogue évaluées sur les données du client (étape Solution). */
  candidates?: Candidate[];
}

export interface ContactStepProps extends StepProps {
  /** Affiche les erreurs de saisie (après une tentative de passage à l'étape suivante). */
  showErrors: boolean;
}
