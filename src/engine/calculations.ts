/**
 * Moteur de calcul ROI – fonctions pures, sans dépendance à l'UI.
 *
 * Dérivés :
 *   produits_jour   = commandes_jour × produits_par_commande
 *   produits_heure  = produits_jour / heures_jour
 *   bacs_heure      = (commandes_jour × bacs_par_commande) / heures_jour
 *   commandes_heure = commandes_jour / heures_jour
 *   débit_catégorie = produits_heure × part_mix_catégorie
 *
 * Par poste :
 *   effectif_équipe = débit_cible / productivité   (0 si productivité ≤ 0 ou débit = 0)
 *   encadrement     : effectif_équipe = managers_par_équipe
 *   effectif_jour   = effectif_équipe × nb_équipes
 *   jours_hommes_an = effectif_jour × jours_par_an
 *   coût_annuel     = effectif_jour × coût_opérateur_an
 *   coût_horizon    = coût_annuel × horizon_années
 */
import type {
  Alert,
  CapacityInfo,
  CumulativePoint,
  FlowSource,
  Machine,
  PostInput,
  PostResult,
  ProductCategory,
  ProductMix,
  RoiResult,
  ScenarioKey,
  ScenarioResult,
  SimulationInputs,
  SimulationResult,
} from './types';

/** Convertit toute valeur en nombre fini ≥ 0 (NaN, Infinity, négatifs → 0). */
export function sanitize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Division protégée : 0 si le dénominateur ou le numérateur n'est pas strictement positif. */
export function safeDivide(numerator: number, denominator: number): number {
  const a = sanitize(numerator);
  const b = sanitize(denominator);
  if (a === 0 || b === 0) return 0;
  return a / b;
}

export interface DerivedFlows {
  ordersPerDay: number;
  ordersPerHour: number;
  productsPerDay: number;
  productsPerHour: number;
  binsPerHour: number;
  categoryThroughput: Record<ProductCategory, number>;
}

/** Calcule les débits dérivés d'un volume de commandes. */
export function computeDerivedFlows(params: {
  ordersPerDay: number;
  productsPerOrder: number;
  hoursPerDay: number;
  binsPerOrder: number;
  mix: ProductMix;
}): DerivedFlows {
  const ordersPerDay = sanitize(params.ordersPerDay);
  const productsPerDay = ordersPerDay * sanitize(params.productsPerOrder);
  const productsPerHour = safeDivide(productsPerDay, params.hoursPerDay);
  const binsPerHour = safeDivide(ordersPerDay * sanitize(params.binsPerOrder), params.hoursPerDay);
  return {
    ordersPerDay,
    ordersPerHour: safeDivide(ordersPerDay, params.hoursPerDay),
    productsPerDay,
    productsPerHour,
    binsPerHour,
    categoryThroughput: {
      standard: productsPerHour * (sanitize(params.mix.standard) / 100),
      fragile: productsPerHour * (sanitize(params.mix.fragile) / 100),
      specific: productsPerHour * (sanitize(params.mix.specific) / 100),
    },
  };
}

/** Débit cible d'un poste en fonction du flux sur lequel il est dimensionné. */
export function throughputForFlow(flow: FlowSource, derived: DerivedFlows): number {
  switch (flow) {
    case 'standard':
    case 'fragile':
    case 'specific':
      return derived.categoryThroughput[flow];
    case 'bins':
      return derived.binsPerHour;
    case 'orders':
      return derived.ordersPerHour;
    case 'management':
      return 0;
  }
}

/**
 * Effectif par équipe d'un poste.
 * - Encadrement : managers par équipe (0 s'il n'y a aucune activité).
 * - Autres postes : débit / productivité, 0 si productivité ≤ 0 ou débit = 0.
 */
export function headcountPerShift(
  flow: FlowSource,
  throughput: number,
  productivity: number,
  hasActivity: boolean,
): number {
  if (flow === 'management') return hasActivity ? sanitize(productivity) : 0;
  return safeDivide(throughput, productivity);
}

/** Productivité de référence d'un poste pour les scénarios futurs. */
export function referenceProductivity(
  post: PostInput,
  mode: SimulationInputs['staffing']['mode'],
  currentDerived: DerivedFlows,
): number {
  const declared = post.currentHeadcount;
  if (mode !== 'declared' || declared === null || !(declared > 0)) return sanitize(post.productivity);
  if (post.flow === 'management') return declared;
  // Productivité implicite déduite de l'effectif saisi : débit actuel / effectif actuel
  const implied = safeDivide(throughputForFlow(post.flow, currentDerived), declared);
  return implied > 0 ? implied : sanitize(post.productivity);
}

/** Poste virtuel « conduite des machines » (ex. opérateur d'injection), présent dans les 3 scénarios pour aligner les tableaux. */
export const MACHINE_OPERATION_POST_ID = 'machine_operation';

function machineOperationPost(machine: Machine): PostInput {
  return {
    id: MACHINE_OPERATION_POST_ID,
    label: `Conduite ${machine.family}`,
    unit: 'managers',
    flow: 'management',
    productivity: sanitize(machine.operatorsPerShift),
    currentHeadcount: null,
  };
}

function needsOperationPost(machine?: Machine): machine is Machine {
  return !!machine && sanitize(machine.operatorsPerShift) > 0;
}

interface PostComputation {
  post: PostInput;
  productivity: number;
  status: PostResult['status'];
  /** Effectif par équipe imposé (saisie client). */
  forcedPerShift?: number;
}

function buildScenario(
  key: ScenarioKey,
  derived: DerivedFlows,
  computations: PostComputation[],
  inputs: SimulationInputs,
): ScenarioResult {
  const shifts = sanitize(inputs.volumes.shiftsPerDay);
  const days = sanitize(inputs.volumes.daysPerYear);
  const cost = sanitize(inputs.staffing.costPerOperatorYear);
  const horizon = sanitize(inputs.staffing.horizonYears);
  const hasActivity = derived.productsPerHour > 0;

  const posts: PostResult[] = computations.map(({ post, productivity, status, forcedPerShift }) => {
    const throughput = throughputForFlow(post.flow, derived);
    const perShift =
      status === 'removed'
        ? 0
        : forcedPerShift !== undefined
          ? sanitize(forcedPerShift)
          : headcountPerShift(post.flow, throughput, productivity, hasActivity);
    const perDay = perShift * shifts;
    const manDaysYear = perDay * days;
    const annualCost = perDay * cost;
    return {
      id: post.id,
      label: post.label,
      unit: post.unit,
      flow: post.flow,
      throughput,
      productivity,
      perShift,
      perDay,
      manDaysYear,
      annualCost,
      horizonCost: annualCost * horizon,
      status,
    };
  });

  const totals = posts.reduce(
    (acc, p) => ({
      perShift: acc.perShift + p.perShift,
      perDay: acc.perDay + p.perDay,
      manDaysYear: acc.manDaysYear + p.manDaysYear,
      annualCost: acc.annualCost + p.annualCost,
      horizonCost: acc.horizonCost + p.horizonCost,
    }),
    { perShift: 0, perDay: 0, manDaysYear: 0, annualCost: 0, horizonCost: 0 },
  );

  return {
    key,
    ordersPerDay: derived.ordersPerDay,
    productsPerDay: derived.productsPerDay,
    productsPerHour: derived.productsPerHour,
    binsPerHour: derived.binsPerHour,
    categoryThroughput: derived.categoryThroughput,
    posts,
    totals,
  };
}

function derivedFor(inputs: SimulationInputs, ordersPerDay: number): DerivedFlows {
  return computeDerivedFlows({
    ordersPerDay,
    productsPerOrder: inputs.volumes.productsPerOrder,
    hoursPerDay: inputs.volumes.hoursPerDay,
    binsPerOrder: inputs.flows.binsPerOrder,
    mix: inputs.volumes.mix,
  });
}

/** Scénario A : volumes actuels, productivités manuelles (ou effectifs saisis). */
export function computeCurrentScenario(inputs: SimulationInputs, machine?: Machine): ScenarioResult {
  const derived = derivedFor(inputs, inputs.volumes.ordersPerDayCurrent);
  const declared = inputs.staffing.mode === 'declared';
  const computations: PostComputation[] = inputs.staffing.posts.map((post) => ({
    post,
    productivity: referenceProductivity(post, inputs.staffing.mode, derived),
    status: 'manual',
    forcedPerShift:
      declared && post.currentHeadcount !== null ? post.currentHeadcount : undefined,
  }));
  if (needsOperationPost(machine)) {
    computations.push({ post: machineOperationPost(machine), productivity: 0, status: 'manual', forcedPerShift: 0 });
  }
  return buildScenario('A', derived, computations, inputs);
}

/**
 * Scénario B : volumes futurs, productivités manuelles.
 * Les débits sont recalculés à partir des produits/heure futurs (jamais par règle de trois).
 */
export function computeFutureManualScenario(inputs: SimulationInputs, machine?: Machine): ScenarioResult {
  const current = derivedFor(inputs, inputs.volumes.ordersPerDayCurrent);
  const derived = derivedFor(inputs, inputs.volumes.ordersPerDayFuture);
  const computations: PostComputation[] = inputs.staffing.posts.map((post) => ({
    post,
    productivity: referenceProductivity(post, inputs.staffing.mode, current),
    status: 'manual',
  }));
  if (needsOperationPost(machine)) {
    computations.push({ post: machineOperationPost(machine), productivity: 0, status: 'manual', forcedPerShift: 0 });
  }
  return buildScenario('B', derived, computations, inputs);
}

/** Scénario C : volumes futurs, productivités de la machine, postes supprimés à 0. */
export function computeFutureIsitecScenario(
  inputs: SimulationInputs,
  machine: Machine,
): ScenarioResult {
  const current = derivedFor(inputs, inputs.volumes.ordersPerDayCurrent);
  const derived = derivedFor(inputs, inputs.volumes.ordersPerDayFuture);
  const computations = inputs.staffing.posts.map((post): PostComputation => {
      if (machine.removedPosts.includes(post.id)) {
        return { post, productivity: 0, status: 'removed' };
      }
      const machineProductivity = machine.productivities[post.id];
      if (machineProductivity !== undefined) {
        return { post, productivity: sanitize(machineProductivity), status: 'modified' };
      }
      return {
        post,
        productivity: referenceProductivity(post, inputs.staffing.mode, current),
        status: 'manual',
      };
  });
  if (needsOperationPost(machine)) {
    // Opérateurs de conduite : par machine et par équipe, seulement s'il y a de l'activité
    const quantity = Math.max(1, Math.round(sanitize(inputs.machineQuantity)) || 1);
    computations.push({
      post: machineOperationPost(machine),
      productivity: sanitize(machine.operatorsPerShift),
      status: 'modified',
      forcedPerShift: derived.productsPerHour > 0 ? sanitize(machine.operatorsPerShift) * quantity : 0,
    });
  }
  return buildScenario('C', derived, computations, inputs);
}

/** ROI : comparaison du scénario B (futur manuel) et du scénario C (futur ISITEC). */
export function computeRoi(params: {
  annualCostManual: number;
  annualCostIsitec: number;
  perDayManual: number;
  perDayIsitec: number;
  capex: number;
  opexYear: number;
  horizonYears: number;
  /** false = prix sur devis non renseigné (délai de retour non calculable). Par défaut : true. */
  priceKnown?: boolean;
}): RoiResult {
  const capex = sanitize(params.capex);
  const opexYear = sanitize(params.opexYear);
  const horizon = sanitize(params.horizonYears);
  const annualCostManual = sanitize(params.annualCostManual);
  const annualCostIsitec = sanitize(params.annualCostIsitec);

  const priceKnown = params.priceKnown ?? true;
  const annualSavings = annualCostManual - (annualCostIsitec + opexYear);
  const profitable = annualSavings > 0;
  const paybackMonths = profitable && priceKnown ? (capex / annualSavings) * 12 : null;
  const cumulativeGain = annualSavings * horizon - capex;
  const roiPercent = capex > 0 && priceKnown ? (cumulativeGain / capex) * 100 : null;

  const months = Math.max(1, Math.round(horizon * 12));
  const cumulative: CumulativePoint[] = [];
  for (let m = 0; m <= months; m++) {
    cumulative.push({
      month: m,
      manual: (annualCostManual * m) / 12,
      isitec: capex + ((annualCostIsitec + opexYear) * m) / 12,
    });
  }

  return {
    priceKnown,
    capex,
    opexYear,
    annualSavings,
    profitable,
    paybackMonths,
    cumulativeGain,
    roiPercent,
    operatorsSaved: sanitize(params.perDayManual) - sanitize(params.perDayIsitec),
    cumulative,
  };
}

/** Débit de pointe pré-calculé : produits/heure au volume futur. */
export function defaultPeakThroughput(inputs: SimulationInputs): number {
  return derivedFor(inputs, inputs.volumes.ordersPerDayFuture).productsPerHour;
}

export function computeCapacity(
  inputs: SimulationInputs,
  machine: Machine,
  quantity: number,
): CapacityInfo {
  const peakProducts =
    inputs.flows.peakThroughput !== null
      ? sanitize(inputs.flows.peakThroughput)
      : defaultPeakThroughput(inputs);
  // Packing : la cadence machine s'exprime en commandes/h → pointe produits ÷ produits par commande
  const unit = machine.throughputUnit;
  const peakThroughput = unit === 'orders' ? safeDivide(peakProducts, inputs.volumes.productsPerOrder) : peakProducts;
  const installedThroughput = sanitize(machine.maxThroughput) * quantity;
  const outputsAvailable = machine.outputs === null ? null : sanitize(machine.outputs) * quantity;
  const outputsRequired = sanitize(inputs.flows.outputsRequired);
  const machinesNeeded = Math.max(
    1,
    Math.ceil(safeDivide(peakThroughput, machine.maxThroughput)),
    machine.outputs === null ? 1 : Math.ceil(safeDivide(outputsRequired, machine.outputs)),
  );
  return {
    unit,
    peakThroughput,
    installedThroughput,
    utilization: safeDivide(peakThroughput, installedThroughput),
    outputsRequired,
    outputsAvailable,
    machinesNeeded,
  };
}

const FLOW_TOLERANCE = 0.005; // 0,5 %

export function computeAlerts(
  inputs: SimulationInputs,
  scenarios: Record<ScenarioKey, ScenarioResult>,
  capacity: CapacityInfo,
  machine: Machine,
): Alert[] {
  const alerts: Alert[] = [];
  const mix = inputs.volumes.mix;
  const mixTotal = sanitize(mix.standard) + sanitize(mix.fragile) + sanitize(mix.specific);

  for (const key of ['A', 'B'] as const) {
    const s = scenarios[key];
    const sum = s.categoryThroughput.standard + s.categoryThroughput.fragile + s.categoryThroughput.specific;
    if (s.productsPerHour > 0 && Math.abs(sum - s.productsPerHour) > s.productsPerHour * FLOW_TOLERANCE) {
      alerts.push({
        code: 'categoryFlowMismatch',
        severity: 'warning',
        params: { sum, productsPerHour: s.productsPerHour, mixTotal },
      });
      break;
    }
  }

  if (capacity.installedThroughput > 0 && capacity.peakThroughput > capacity.installedThroughput) {
    alerts.push({
      code: 'capacityExceeded',
      severity: 'warning',
      params: {
        peak: capacity.peakThroughput,
        max: capacity.installedThroughput,
        unit: capacity.unit,
        machine: machine.name,
        machinesNeeded: capacity.machinesNeeded,
      },
    });
  }

  if (capacity.outputsAvailable !== null && capacity.outputsRequired > capacity.outputsAvailable) {
    alerts.push({
      code: 'outputsExceeded',
      severity: 'warning',
      params: {
        required: capacity.outputsRequired,
        available: capacity.outputsAvailable,
        machine: machine.name,
        machinesNeeded: capacity.machinesNeeded,
      },
    });
  }

  if (inputs.machineCapex === null && machine.capex === null) {
    alerts.push({ code: 'priceOnRequest', severity: 'info', params: { machine: machine.name } });
  }

  if (scenarios.B.productsPerHour === 0) {
    alerts.push({ code: 'noVolume', severity: 'info', params: {} });
  }

  return alerts;
}

/** Point d'entrée : calcule les 3 scénarios, le ROI, la capacité et les alertes. */
export function runSimulation(inputs: SimulationInputs, machine: Machine): SimulationResult {
  const quantity = Math.max(1, Math.round(sanitize(inputs.machineQuantity)) || 1);
  const scenarios = {
    A: computeCurrentScenario(inputs, machine),
    B: computeFutureManualScenario(inputs, machine),
    C: computeFutureIsitecScenario(inputs, machine),
  };
  // Investissement : saisie prioritaire, sinon prix catalogue ; inconnu si « sur devis » et non saisi
  const unitCapex = inputs.machineCapex ?? machine.capex;
  const roi = computeRoi({
    annualCostManual: scenarios.B.totals.annualCost,
    annualCostIsitec: scenarios.C.totals.annualCost,
    perDayManual: scenarios.B.totals.perDay,
    perDayIsitec: scenarios.C.totals.perDay,
    capex: sanitize(unitCapex) * quantity,
    opexYear: machine.opexYear * quantity,
    horizonYears: inputs.staffing.horizonYears,
    priceKnown: unitCapex !== null,
  });
  const capacity = computeCapacity(inputs, machine, quantity);
  const alerts = computeAlerts(inputs, scenarios, capacity, machine);
  return { scenarios, roi, capacity, alerts, machine, machineQuantity: quantity };
}
