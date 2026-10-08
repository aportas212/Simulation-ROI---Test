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
 * - les commandes (commandes/h, ex. emballage),
 * - l'encadrement (managers par équipe, pas de débit).
 */
export type FlowSource = ProductCategory | 'bins' | 'orders' | 'management';

/** Identifiants des postes standards (des postes personnalisés peuvent avoir d'autres id). */
export type StandardPostId =
  | 'picking_standard'
  | 'sorting_standard'
  | 'fragile_pick_pack'
  | 'specific_pick_pack'
  | 'consolidation'
  | 'packing'
  | 'management';

export type PostUnit = 'pieces' | 'bins' | 'orders' | 'managers';

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
  /** Famille commerciale (ex. ISIWALL 3D) pour regrouper les configurations. */
  family: string;
  description: string;
  type: MachineType;
  /** Photo ou rendu produit (URL). */
  image?: string;
  /** Cadence maximale. */
  maxThroughput: number;
  /** Unité de la cadence : pièces/h (tri) ou commandes/h (packing). */
  throughputUnit: 'pieces' | 'orders';
  /** Nombre de sorties / destinations (null = sans objet ou non communiqué). */
  outputs: number | null;
  /** Opérateurs nécessaires à la conduite de chaque machine, par équipe (ex. injection). */
  operatorsPerShift: number;
  /** Nouvelles productivités opérateur pour les postes modifiés (même unité que le poste). */
  productivities: Partial<Record<string, number>>;
  /** Postes supprimés par la machine (effectif = 0). */
  removedPosts: string[];
  /** Investissement catalogue (€ HT). null = prix sur devis. */
  capex: number | null;
  /** Coûts annuels : hotline, maintenance, licences (€ HT/an). */
  opexYear: number;
  /** Points forts affichés sur la fiche. */
  highlights: string[];
  /** Caractéristiques complémentaires (libellé, valeur). */
  specs: [string, string][];
  /** Hypothèses retenues par le simulateur quand les documents ne précisent pas. */
  assumptions: string[];
  /** Document source des données. */
  source: string;
}

export type ClientSector = '' | 'retail' | 'ecommerce' | '3pl' | 'industry' | 'other';

/** Coordonnées du client (page 1). Non utilisées par le moteur : servent à personnaliser l'étude et le PDF. */
export interface ClientInfo {
  company: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  sector: ClientSector;
}

export interface SimulationInputs {
  client: ClientInfo;
  volumes: VolumeInputs;
  flows: FlowInputs;
  staffing: StaffingInputs;
  machineId: string;
  /** Nombre de machines installées (1 par défaut). */
  machineQuantity: number;
  /** Investissement saisi (€ HT par machine) : remplace le prix catalogue ou complète un prix sur devis. */
  machineCapex: number | null;
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
  /** false si aucun prix n'est connu (machine sur devis, investissement non saisi). */
  priceKnown: boolean;
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
  | 'priceOnRequest'
  | 'noVolume';

export interface Alert {
  code: AlertCode;
  severity: 'warning' | 'info';
  params: Record<string, string | number>;
}

export interface CapacityInfo {
  /** Unité du débit comparé à la cadence machine. */
  unit: 'pieces' | 'orders';
  peakThroughput: number;
  installedThroughput: number;
  /** Taux d'utilisation (0–1+). */
  utilization: number;
  outputsRequired: number;
  /** null = sans objet pour cette machine. */
  outputsAvailable: number | null;
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
