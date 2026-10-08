import type { ClientInfo, PostInput, SimulationInputs } from '../engine/types';
import { MACHINES, PACKING_POST } from './machines';

/** Postes par défaut (tableau de l'étape 3). Productivités manuelles par opérateur et par heure. */
export const DEFAULT_POSTS: PostInput[] = [
  { id: 'picking_standard', label: 'Picking produits standard (batch)', unit: 'pieces', flow: 'standard', productivity: 120, currentHeadcount: null },
  { id: 'sorting_standard', label: 'Tri et mise en bac standard', unit: 'pieces', flow: 'standard', productivity: 1200, currentHeadcount: null },
  { id: 'fragile_pick_pack', label: 'Pick & pack fragile / gros volume', unit: 'pieces', flow: 'fragile', productivity: 60, currentHeadcount: null },
  { id: 'specific_pick_pack', label: 'Pick & pack produits spécifiques', unit: 'pieces', flow: 'specific', productivity: 250, currentHeadcount: null },
  { id: 'consolidation', label: 'Consolidation et palettisation', unit: 'bins', flow: 'bins', productivity: 150, currentHeadcount: null },
  { ...PACKING_POST },
  { id: 'management', label: 'Encadrement', unit: 'managers', flow: 'management', productivity: 1, currentHeadcount: null },
];

export const EMPTY_CLIENT: ClientInfo = { company: '', contactName: '', role: '', email: '', phone: '', sector: '' };

export function createDefaultInputs(): SimulationInputs {
  return {
    client: { ...EMPTY_CLIENT },
    volumes: {
      // Valeurs d'exemple : site e-commerce / retail moyen, à remplacer par celles du client
      ordersPerDayCurrent: 1500,
      ordersPerDayFuture: 2000,
      productsPerOrder: 8,
      hoursPerDay: 15,
      shiftsPerDay: 2,
      daysPerYear: 300,
      mix: { standard: 82.5, fragile: 12.5, specific: 5, specificLabel: 'Tabac' },
    },
    flows: {
      peakThroughput: null,
      outputsRequired: 60,
      binsPerOrder: 1,
    },
    staffing: {
      mode: 'computed',
      posts: DEFAULT_POSTS.map((p) => ({ ...p })),
      costPerOperatorYear: 30000,
      horizonYears: 5,
    },
    machineId: MACHINES[0].id,
    machineQuantity: 1,
    machineCapex: null,
    machineSelection: 'auto',
  };
}
