import { describe, expect, it } from 'vitest';
import { evaluateCandidates, recommendedCandidate } from './recommend';
import type { Machine, PostInput, SimulationInputs } from './types';

const posts: PostInput[] = [
  { id: 'picking_standard', label: 'Picking', unit: 'pieces', flow: 'standard', productivity: 120, currentHeadcount: null },
  { id: 'sorting_standard', label: 'Tri', unit: 'pieces', flow: 'standard', productivity: 400, currentHeadcount: null },
  { id: 'packing', label: 'Emballage', unit: 'orders', flow: 'orders', productivity: 240, currentHeadcount: null },
  { id: 'management', label: 'Encadrement', unit: 'managers', flow: 'management', productivity: 1, currentHeadcount: null },
];

function inputs(over: Partial<SimulationInputs['flows']> = {}): SimulationInputs {
  return {
    client: { company: '', contactName: '', role: '', email: '', phone: '', sector: '' },
    volumes: {
      ordersPerDayCurrent: 1500,
      ordersPerDayFuture: 2000,
      productsPerOrder: 8,
      hoursPerDay: 15,
      shiftsPerDay: 2,
      daysPerYear: 300,
      mix: { standard: 100, fragile: 0, specific: 0, specificLabel: '' },
    },
    flows: { peakThroughput: null, outputsRequired: 60, binsPerOrder: 1, ...over },
    staffing: { mode: 'computed', posts, costPerOperatorYear: 30000, horizonYears: 5 },
    machineId: 'x',
    machineQuantity: 1,
    machineCapex: null,
    machineSelection: 'auto',
  };
}

const base = { family: 'F', description: '', highlights: [], specs: [], assumptions: [], source: '', opexYear: 9200 };
const sorterSmall: Machine = { ...base, id: 's60', name: 'Sorter 60', type: 'tri', maxThroughput: 1500, throughputUnit: 'pieces', outputs: 60, operatorsPerShift: 1, productivities: {}, removedPosts: ['sorting_standard'], capex: 85000 };
const sorterBig: Machine = { ...sorterSmall, id: 's100', name: 'Sorter 100', maxThroughput: 2000, outputs: 100, capex: 120000 };
const sorterOnRequest: Machine = { ...sorterSmall, id: 'sq', name: 'Sorter devis', capex: null };
const bagger: Machine = { ...base, id: 'bag', name: 'Bagger', type: 'packing', maxThroughput: 600, throughputUnit: 'orders', outputs: null, operatorsPerShift: 0, productivities: { packing: 600 }, removedPosts: [], capex: 55500 };
const unrelated: Machine = { ...bagger, id: 'none', name: 'Sans effet', productivities: { inconnu: 999 } };

describe('recommandation', () => {
  const candidates = evaluateCandidates(inputs(), [sorterBig, bagger, sorterSmall, sorterOnRequest, unrelated]);
  const best = recommendedCandidate(candidates)!;

  it('recommande la solution chiffrée la plus rentable sur l’horizon', () => {
    const profitable = candidates.filter((c) => c.result.roi.priceKnown && c.result.roi.profitable);
    const maxGain = Math.max(...profitable.map((c) => c.result.roi.cumulativeGain));
    expect(best.result.roi.cumulativeGain).toBe(maxGain);
    expect(best.machine.id).toBe('s60');
    expect(candidates[0]).toBe(best);
  });

  it('dimensionne le nombre de machines sur la pointe et les sorties', () => {
    const c = evaluateCandidates(inputs({ outputsRequired: 150 }), [sorterSmall])[0];
    expect(c.quantity).toBe(3); // 150 sorties / 60
    expect(c.result.capacity.utilization).toBeLessThanOrEqual(1);
  });

  it('écarte les machines sans effet sur les postes du client et signale les prix sur devis', () => {
    expect(candidates.find((c) => c.machine.id === 'none')!.status).toBe('notApplicable');
    expect(candidates.find((c) => c.machine.id === 'sq')!.status).toBe('onRequest');
  });

  it('sans solution rentable, aucune recommandation', () => {
    const i = inputs();
    i.staffing.posts = posts.map((p) => (p.id === 'sorting_standard' ? { ...p, productivity: 5000 } : p.id === 'packing' ? { ...p, productivity: 2000 } : p));
    expect(recommendedCandidate(evaluateCandidates(i, [sorterSmall, bagger]))).toBeNull();
  });
});

it('une solution remboursée au-delà de l’horizon n’est pas recommandée', () => {
  const i = inputs();
  i.staffing.horizonYears = 1;
  const c = evaluateCandidates(i, [{ ...sorterSmall, capex: 300_000 }])[0];
  expect(c.result.roi.annualSavings).toBeGreaterThan(0);
  expect(c.result.roi.cumulativeGain).toBeLessThan(0);
  expect(c.status).toBe('notProfitable');
});
