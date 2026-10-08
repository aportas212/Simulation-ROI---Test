/**
 * Types du moteur de calcul ROI.
 * Aucune dépendance à l'UI : ces types sont partagés par le moteur, le formulaire et la page résultats.
 */

/** Catégories de produits du mix. */
export type ProductCategory = 'standard' | 'fragile' | 'specific';

/**
 * Flux sur lequel un poste est dimensionné :
 * - une catégorie de produits (pièces/h),
 * - les bacs (bacs/h),
 * - l'encadrement (managers par équipe, pas de débit).
 */
export type FlowSource = ProductCategory | 'bins' | 'management';

/** Identifiants des postes standards (des postes personnalisés peuvent avoir d'autres id). */
export type StandardPostId =
  | 'picking_standard'
  | 'sorting_standard'
  | 'fragile_pick_pack'
  | 'specific_pick_pack'
  | 'consolidation'
  | 'management';

export type PostUnit = 'pieces' | 'bins' | 'managers';

export interface PostInput {
  id: string;
  label: string;
  unit: PostUnit;
  flow: FlowSource;
  /** Productivité manuelle par opérateur et par heure (ou managers par équipe pour l'encadrement). */
  productivity: number;
  /** Effectif actuel saisi par équipe (utilisé seulement en mode "saisie des effectifs"). */
  currentHeadcount: number | null;
}

export interface ProductMix {
  /** Parts en % (0–100). */
  standard: number;
  fragile: number;
  specific: number;
  /** Libellé libre pour les produits spécifiques (ex. tabac). */
  specificLabel: string;
}

export interface VolumeInputs {
  ordersPerDayCurrent: number;
  ordersPerDayFuture: number;
  productsPerOrder: number;
  hoursPerDay: number;
  shiftsPerDay: number;
  daysPerYear: number;
  mix: ProductMix;
}

export interface FlowInputs {
  /** Débit horaire de pointe à traiter (produits/h). null = valeur pré-calculée. */
  peakThroughput: number | null;
  /** Nombre de sorties / destinations de tri nécessaires. */
  outputsRequired: number;
  /** Nombre de bacs par commande (1 par défaut). */
  binsPerOrder: number;
}

export type StaffingMode = 'computed' | 'declared';

export interface StaffingInputs {
  mode: StaffingMode;
  posts: PostInput[];
  /** Coût complet annuel d'un opérateur (€). */
  costPerOperatorYear: number;
  /** Horizon de calcul (années). */
  horizonYears: number;
}

export type MachineType = 'tri' | 'preparation' | 'packing';

export interface Machine {
  id: string;
  name: string;
  description: string;
  type: MachineType;
  /** Cadence maximale (unités/h). */
  maxThroughput: number;
  /** Nombre de sorties / destinations. */
  outputs: number;
  /** Nouvelles productivités opérateur pour les postes modifiés (même unité que le poste). */
  productivities: Partial<Record<string, number>>;
  /** Postes supprimés par la machine (effectif = 0). */
  removedPosts: string[];
  /** Investissement (€). */
  capex: number;
  /** Coûts annuels : maintenance, énergie, licences (€). */
  opexYear: number;
}

export interface SimulationInputs {
  volumes: VolumeInputs;
  flows: FlowInputs;
  staffing: StaffingInputs;
  machineId: string;
  /** Nombre de machines installées (1 par défaut). */
  machineQuantity: number;
}

export type ScenarioKey = 'A' | 'B' | 'C';

export interface PostResult {
  id: string;
  label: string;
  unit: PostUnit;
  flow: FlowSource;
  /** Débit cible (unités/h), 0 pour l'encadrement. */
  throughput: number;
  /** Productivité retenue (ou managers/équipe pour l'encadrement). */
  productivity: number;
  perShift: number;
  perDay: number;
  manDaysYear: number;
  annualCost: number;
  horizonCost: number;
  status: 'manual' | 'modified' | 'removed';
}

export interface ScenarioTotals {
  perShift: number;
  perDay: number;
  manDaysYear: number;
  annualCost: number;
  horizonCost: number;
}

export interface ScenarioResult {
  key: ScenarioKey;
  ordersPerDay: number;
  productsPerDay: number;
  productsPerHour: number;
  binsPerHour: number;
  categoryThroughput: Record<ProductCategory, number>;
  posts: PostResult[];
  totals: ScenarioTotals;
}

export interface CumulativePoint {
  month: number;
  manual: number;
  isitec: number;
}

export interface RoiResult {
  capex: number;
  opexYear: number;
  annualSavings: number;
  profitable: boolean;
  /** null si non rentable. */
  paybackMonths: number | null;
  cumulativeGain: number;
  /** null si capex = 0. */
  roiPercent: number | null;
  operatorsSaved: number;
  cumulative: CumulativePoint[];
}

export type AlertCode =
  | 'categoryFlowMismatch'
  | 'capacityExceeded'
  | 'outputsExceeded'
  | 'noVolume';

export interface Alert {
  code: AlertCode;
  severity: 'warning' | 'info';
  params: Record<string, string | number>;
}

export interface CapacityInfo {
  peakThroughput: number;
  installedThroughput: number;
  /** Taux d'utilisation (0–1+). */
  utilization: number;
  outputsRequired: number;
  outputsAvailable: number;
  machinesNeeded: number;
}

export interface SimulationResult {
  scenarios: Record<ScenarioKey, ScenarioResult>;
  roi: RoiResult;
  capacity: CapacityInfo;
  alerts: Alert[];
  machine: Machine;
  machineQuantity: number;
}
