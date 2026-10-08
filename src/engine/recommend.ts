/**
 * Recommandation automatique de la solution ISITEC à partir des données du client.
 *
 * Pour chaque machine du catalogue :
 *  1. vérifie qu'elle agit sur au moins un poste du client ayant de l'activité ;
 *  2. dimensionne le nombre de machines (débit de pointe et nombre de sorties) ;
 *  3. simule les 3 scénarios et le ROI au prix catalogue.
 * La solution recommandée est la plus rentable sur l'horizon parmi celles qui ont un prix ;
 * à défaut, la solution « sur devis » qui économise le plus par an.
 */
import { runSimulation } from './calculations';
import type { Machine, SimulationInputs, SimulationResult } from './types';

export type CandidateStatus = 'recommended' | 'profitable' | 'notProfitable' | 'onRequest' | 'notApplicable';

export interface Candidate {
  machine: Machine;
  quantity: number;
  result: SimulationResult;
  status: CandidateStatus;
}

/** La machine agit-elle sur un poste du client qui a de l'activité au volume futur ? */
export function isApplicable(machine: Machine, result: SimulationResult): boolean {
  const touched = new Set([...machine.removedPosts, ...Object.keys(machine.productivities)]);
  return result.scenarios.B.posts.some((p) => touched.has(p.id) && p.perDay > 0);
}

export function evaluateCandidates(inputs: SimulationInputs, machines: Machine[]): Candidate[] {
  const candidates = machines.map((machine): Candidate => {
    const base: SimulationInputs = { ...inputs, machineId: machine.id, machineCapex: null, machineQuantity: 1 };
    const sizing = runSimulation(base, machine);
    const quantity = sizing.capacity.machinesNeeded;
    const result = quantity === 1 ? sizing : runSimulation({ ...base, machineQuantity: quantity }, machine);
    let status: CandidateStatus;
    if (!isApplicable(machine, result)) status = 'notApplicable';
    else if (!result.roi.priceKnown) status = result.roi.annualSavings > 0 ? 'onRequest' : 'notProfitable';
    // Rentable = économie annuelle positive ET investissement remboursé sur l'horizon
    else status = result.roi.profitable && result.roi.cumulativeGain > 0 ? 'profitable' : 'notProfitable';
    return { machine, quantity, result, status };
  });

  const best = pickBest(candidates);
  if (best) best.status = 'recommended';
  return candidates.sort(compareCandidates);
}

function pickBest(candidates: Candidate[]): Candidate | null {
  const priced = candidates
    .filter((c) => c.status === 'profitable')
    .sort((a, b) => b.result.roi.cumulativeGain - a.result.roi.cumulativeGain || (a.result.roi.paybackMonths ?? Infinity) - (b.result.roi.paybackMonths ?? Infinity));
  if (priced.length > 0) return priced[0];
  const onRequest = candidates
    .filter((c) => c.status === 'onRequest' && c.result.roi.annualSavings > 0)
    .sort((a, b) => b.result.roi.annualSavings - a.result.roi.annualSavings);
  return onRequest[0] ?? null;
}

const STATUS_ORDER: Record<CandidateStatus, number> = {
  recommended: 0,
  profitable: 1,
  onRequest: 2,
  notProfitable: 3,
  notApplicable: 4,
};

/** Ordre d'affichage du comparatif : recommandée, rentables, sur devis, non rentables, non applicables. */
function compareCandidates(a: Candidate, b: Candidate): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.result.roi.annualSavings - a.result.roi.annualSavings;
}

export function recommendedCandidate(candidates: Candidate[]): Candidate | null {
  return candidates.find((c) => c.status === 'recommended') ?? null;
}
