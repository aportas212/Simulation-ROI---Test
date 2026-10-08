import { describe, expect, it } from 'vitest';
import {
  computeCurrentScenario,
  computeDerivedFlows,
  computeFutureIsitecScenario,
  computeFutureManualScenario,
  computeRoi,
  headcountPerShift,
  runSimulation,
  safeDivide,
} from './calculations';
import type { Machine, PostInput, SimulationInputs } from './types';

/** Vérifie une valeur à ±0,5 % près. */
function expectWithin(actual: number, expected: number, tolerance = 0.005) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * tolerance);
}

function posts(overrides: Partial<Record<string, number>> = {}): PostInput[] {
  const base: PostInput[] = [
    { id: 'picking_standard', label: 'Picking', unit: 'pieces', flow: 'standard', productivity: 380, currentHeadcount: null },
    { id: 'sorting_standard', label: 'Tri', unit: 'pieces', flow: 'standard', productivity: 1000, currentHeadcount: null },
    { id: 'fragile_pick_pack', label: 'Fragile', unit: 'pieces', flow: 'fragile', productivity: 380, currentHeadcount: null },
    { id: 'specific_pick_pack', label: 'Spécifique', unit: 'pieces', flow: 'specific', productivity: 250, currentHeadcount: null },
    { id: 'consolidation', label: 'Consolidation', unit: 'bins', flow: 'bins', productivity: 150, currentHeadcount: null },
    { id: 'management', label: 'Encadrement', unit: 'managers', flow: 'management', productivity: 1, currentHeadcount: null },
  ];
  return base.map((p) => (overrides[p.id] !== undefined ? { ...p, productivity: overrides[p.id]! } : p));
}

/** Cas de test obligatoire. */
function referenceInputs(): SimulationInputs {
  return {
    client: { company: '', contactName: '', role: '', email: '', phone: '', sector: '' },
    volumes: {
      ordersPerDayCurrent: 3000,
      ordersPerDayFuture: 3000,
      productsPerOrder: 20,
      hoursPerDay: 15,
      shiftsPerDay: 2,
      daysPerYear: 300,
      mix: { standard: 82.5, fragile: 12.5, specific: 5, specificLabel: 'Tabac' },
    },
    flows: { peakThroughput: null, outputsRequired: 50, binsPerOrder: 1 },
    staffing: { mode: 'computed', posts: posts(), costPerOperatorYear: 20000, horizonYears: 5 },
    machineId: 'test',
    machineQuantity: 1,
    machineCapex: null,
    machineSelection: 'manual',
  };
}

const machine: Machine = {
  id: 'test',
  name: 'Machine test',
  family: 'Test',
  description: '',
  type: 'tri',
  maxThroughput: 6000,
  throughputUnit: 'pieces',
  outputs: 100,
  operatorsPerShift: 0,
  highlights: [],
  specs: [],
  assumptions: [],
  source: 'test',
  productivities: { picking_standard: 600 },
  removedPosts: ['sorting_standard'],
  capex: 500_000,
  opexYear: 20_000,
};

describe('cas de test obligatoire', () => {
  const inputs = referenceInputs();
  const a = computeCurrentScenario(inputs);

  it('calcule les débits dérivés', () => {
    expect(a.productsPerDay).toBe(60_000);
    expect(a.productsPerHour).toBe(4000);
    expect(a.binsPerHour).toBe(200);
    expectWithin(a.categoryThroughput.standard, 3300);
    expectWithin(a.categoryThroughput.fragile, 500);
    expectWithin(a.categoryThroughput.specific, 200);
  });

  it('16,4 opérateurs par équipe', () => {
    expectWithin(a.totals.perShift, 16.4);
  });

  it('32,9 opérateurs par jour', () => {
    expectWithin(a.totals.perDay, 32.9);
  });

  it('9 860 jours-hommes par an', () => {
    expectWithin(a.totals.manDaysYear, 9860);
  });

  it('657 k€ par an', () => {
    expectWithin(a.totals.annualCost, 657_000);
  });

  it('coût horizon = coût annuel × horizon', () => {
    expectWithin(a.totals.horizonCost, a.totals.annualCost * 5, 1e-9);
  });

  it('encadrement = managers par équipe', () => {
    const mgmt = a.posts.find((p) => p.id === 'management')!;
    expect(mgmt.perShift).toBe(1);
    expect(mgmt.perDay).toBe(2);
  });
});

describe('scénario futur manuel', () => {
  it('recalcule les débits à partir des produits/heure futurs', () => {
    const inputs = referenceInputs();
    inputs.volumes.ordersPerDayFuture = 4500;
    inputs.volumes.productsPerOrder = 10;
    const b = computeFutureManualScenario(inputs);
    expect(b.productsPerHour).toBe(3000); // 4500 × 10 / 15
    expect(b.binsPerHour).toBe(300);
    const picking = b.posts.find((p) => p.id === 'picking_standard')!;
    expectWithin(picking.perShift, (3000 * 0.825) / 380, 1e-9);
  });

  it("utilise la productivité implicite quand l'effectif est saisi", () => {
    const inputs = referenceInputs();
    inputs.staffing.mode = 'declared';
    inputs.staffing.posts = inputs.staffing.posts.map((p) =>
      p.id === 'picking_standard' ? { ...p, currentHeadcount: 11 } : p,
    );
    inputs.volumes.ordersPerDayFuture = 6000;
    const a = computeCurrentScenario(inputs);
    const b = computeFutureManualScenario(inputs);
    expect(a.posts.find((p) => p.id === 'picking_standard')!.perShift).toBe(11);
    // volume ×2 → effectif ×2 à productivité implicite constante
    expectWithin(b.posts.find((p) => p.id === 'picking_standard')!.perShift, 22, 1e-9);
  });
});

describe('scénario ISITEC', () => {
  it('applique les productivités machine et supprime les postes', () => {
    const c = computeFutureIsitecScenario(referenceInputs(), machine);
    const sorting = c.posts.find((p) => p.id === 'sorting_standard')!;
    const picking = c.posts.find((p) => p.id === 'picking_standard')!;
    expect(sorting.perShift).toBe(0);
    expect(sorting.status).toBe('removed');
    expect(picking.status).toBe('modified');
    expectWithin(picking.perShift, 3300 / 600, 1e-9);
  });
});

describe('productivité à 0', () => {
  it("donne un effectif de 0 sans NaN ni Infinity", () => {
    expect(headcountPerShift('standard', 1000, 0, true)).toBe(0);
    expect(headcountPerShift('standard', 1000, -5, true)).toBe(0);
    expect(safeDivide(10, 0)).toBe(0);
    const inputs = referenceInputs();
    inputs.staffing.posts = posts({ picking_standard: 0, consolidation: 0 });
    const a = computeCurrentScenario(inputs);
    for (const p of a.posts) {
      expect(Number.isFinite(p.perShift)).toBe(true);
      expect(Number.isFinite(p.annualCost)).toBe(true);
    }
    expect(a.posts.find((p) => p.id === 'picking_standard')!.perShift).toBe(0);
    expect(Number.isFinite(a.totals.annualCost)).toBe(true);
  });
});

describe('volume à 0', () => {
  it('donne des effectifs et coûts nuls, sans NaN', () => {
    const inputs = referenceInputs();
    inputs.volumes.ordersPerDayCurrent = 0;
    inputs.volumes.ordersPerDayFuture = 0;
    const result = runSimulation(inputs, machine);
    for (const key of ['A', 'B', 'C'] as const) {
      const s = result.scenarios[key];
      expect(s.productsPerHour).toBe(0);
      expect(s.totals.perDay).toBe(0);
      expect(s.totals.annualCost).toBe(0);
    }
    expect(result.roi.profitable).toBe(false);
    expect(result.roi.paybackMonths).toBeNull();
    expect(Number.isFinite(result.roi.cumulativeGain)).toBe(true);
    expect(result.alerts.some((a) => a.code === 'noVolume')).toBe(true);
  });

  it('heures par jour à 0 : pas de division par zéro', () => {
    const flows = computeDerivedFlows({
      ordersPerDay: 1000,
      productsPerOrder: 5,
      hoursPerDay: 0,
      binsPerOrder: 1,
      mix: { standard: 100, fragile: 0, specific: 0, specificLabel: '' },
    });
    expect(flows.productsPerHour).toBe(0);
    expect(flows.binsPerHour).toBe(0);
  });
});

describe('économie négative', () => {
  it('signale le cas non rentable sans délai de retour', () => {
    const roi = computeRoi({
      annualCostManual: 300_000,
      annualCostIsitec: 280_000,
      perDayManual: 10,
      perDayIsitec: 9,
      capex: 500_000,
      opexYear: 50_000,
      horizonYears: 5,
    });
    expect(roi.annualSavings).toBe(-30_000);
    expect(roi.profitable).toBe(false);
    expect(roi.paybackMonths).toBeNull();
    expect(roi.cumulativeGain).toBe(-30_000 * 5 - 500_000);
    expect(roi.roiPercent).toBeLessThan(0);
  });
});

describe('ROI', () => {
  it('applique exactement les formules', () => {
    const roi = computeRoi({
      annualCostManual: 1_000_000,
      annualCostIsitec: 600_000,
      perDayManual: 50,
      perDayIsitec: 30,
      capex: 800_000,
      opexYear: 100_000,
      horizonYears: 5,
    });
    expect(roi.annualSavings).toBe(300_000);
    expect(roi.paybackMonths).toBe(32);
    expect(roi.cumulativeGain).toBe(700_000);
    expectWithin(roi.roiPercent!, 87.5, 1e-9);
    expect(roi.operatorsSaved).toBe(20);
    expect(roi.cumulative).toHaveLength(61);
    expect(roi.cumulative[0]).toEqual({ month: 0, manual: 0, isitec: 800_000 });
  });

  it("runSimulation compare B et C et multiplie capex/opex par le nombre de machines", () => {
    const inputs = referenceInputs();
    inputs.machineQuantity = 2;
    const r = runSimulation(inputs, machine);
    expect(r.roi.capex).toBe(1_000_000);
    expect(r.roi.opexYear).toBe(40_000);
    expectWithin(
      r.roi.annualSavings,
      r.scenarios.B.totals.annualCost - r.scenarios.C.totals.annualCost - 40_000,
      1e-9,
    );
  });
});

describe('contrôles', () => {
  it('alerte si le mix ne fait pas 100 %', () => {
    const inputs = referenceInputs();
    inputs.volumes.mix.standard = 70;
    const r = runSimulation(inputs, machine);
    expect(r.alerts.some((a) => a.code === 'categoryFlowMismatch')).toBe(true);
  });

  it('alerte si le débit de pointe dépasse la cadence max', () => {
    const inputs = referenceInputs();
    inputs.flows.peakThroughput = 9000;
    const r = runSimulation(inputs, machine);
    const alert = r.alerts.find((a) => a.code === 'capacityExceeded');
    expect(alert?.params.machinesNeeded).toBe(2);
  });

  it('alerte si les sorties nécessaires dépassent les sorties de la machine', () => {
    const inputs = referenceInputs();
    inputs.flows.outputsRequired = 150;
    const r = runSimulation(inputs, machine);
    expect(r.alerts.some((a) => a.code === 'outputsExceeded')).toBe(true);
  });

  it("aucune alerte sur le cas nominal", () => {
    expect(runSimulation(referenceInputs(), machine).alerts).toEqual([]);
  });
});

describe('catalogue ISITEC : règles spécifiques', () => {
  it("ajoute l'opérateur de conduite par machine et par équipe (scénario C uniquement)", () => {
    const inputs = referenceInputs();
    inputs.machineQuantity = 2;
    const m: Machine = { ...machine, operatorsPerShift: 1 };
    const r = runSimulation(inputs, m);
    const op = (k: 'A' | 'B' | 'C') => r.scenarios[k].posts.find((p) => p.id === 'machine_operation')!;
    expect(op('A').perShift).toBe(0);
    expect(op('B').perShift).toBe(0);
    expect(op('C').perShift).toBe(2); // 1 opérateur × 2 machines
    expect(op('C').perDay).toBe(4); // × 2 équipes
    // les 3 scénarios gardent le même nombre de lignes (tableau aligné)
    expect(r.scenarios.A.posts).toHaveLength(r.scenarios.C.posts.length);
  });

  it('dimensionne un poste sur le flux commandes/h', () => {
    const inputs = referenceInputs();
    inputs.staffing.posts = [
      ...posts(),
      { id: 'packing', label: 'Emballage', unit: 'orders', flow: 'orders', productivity: 240, currentHeadcount: null },
    ];
    const a = computeCurrentScenario(inputs);
    const packing = a.posts.find((p) => p.id === 'packing')!;
    expect(packing.throughput).toBe(200); // 3 000 commandes / 15 h
    expectWithin(packing.perShift, 200 / 240, 1e-9);
  });

  it('compare la cadence packing en commandes/h', () => {
    const inputs = referenceInputs(); // 4 000 produits/h, 20 produits/commande → 200 commandes/h
    const packer: Machine = { ...machine, throughputUnit: 'orders', maxThroughput: 600, outputs: null };
    const r = runSimulation(inputs, packer);
    expect(r.capacity.unit).toBe('orders');
    expect(r.capacity.peakThroughput).toBe(200);
    expect(r.capacity.outputsAvailable).toBeNull();
    expect(r.alerts.some((a) => a.code === 'outputsExceeded')).toBe(false);
  });

  it('prix sur devis : pas de délai de retour tant que l’investissement n’est pas saisi', () => {
    const inputs = referenceInputs();
    const onRequest: Machine = { ...machine, capex: null };
    const r = runSimulation(inputs, onRequest);
    expect(r.roi.priceKnown).toBe(false);
    expect(r.roi.paybackMonths).toBeNull();
    expect(r.alerts.some((a) => a.code === 'priceOnRequest')).toBe(true);

    inputs.machineCapex = 90_000;
    const r2 = runSimulation(inputs, onRequest);
    expect(r2.roi.priceKnown).toBe(true);
    expect(r2.roi.capex).toBe(90_000);
    expect(r2.alerts.some((a) => a.code === 'priceOnRequest')).toBe(false);
  });

  it("l'investissement saisi remplace le prix catalogue", () => {
    const inputs = referenceInputs();
    inputs.machineCapex = 400_000;
    expect(runSimulation(inputs, machine).roi.capex).toBe(400_000);
  });
});
