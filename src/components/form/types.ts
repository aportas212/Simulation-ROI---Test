import type { SimulationInputs, SimulationResult } from '../../engine/types';

export type Updater = (fn: (draft: SimulationInputs) => SimulationInputs) => void;

export interface StepProps {
  inputs: SimulationInputs;
  update: Updater;
  result: SimulationResult;
}
