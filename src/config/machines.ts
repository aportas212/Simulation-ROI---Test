/**
 * ============================================================================
 *  CATALOGUE DES MACHINES ISITEC
 * ============================================================================
 *  Ce fichier peut être modifié sans toucher au code de l'interface.
 *  Chaque machine définit :
 *    - id             : identifiant technique unique (sans espace)
 *    - name           : nom commercial affiché
 *    - description    : description courte (1 phrase)
 *    - type           : 'tri' | 'preparation' | 'packing'
 *    - maxThroughput  : cadence maximale (unités/heure)
 *    - outputs        : nombre de sorties / destinations
 *    - productivities : nouvelles productivités opérateur / heure pour les postes
 *                       que la machine modifie (clé = id du poste, voir
 *                       src/config/defaults.ts). Pour 'management', la valeur
 *                       est un nombre de managers par équipe.
 *    - removedPosts   : postes supprimés (effectif ramené à 0)
 *    - capex          : investissement (€)
 *    - opexYear       : coûts annuels (€) : maintenance, énergie, licences
 *
 *  Identifiants de postes disponibles :
 *    picking_standard, sorting_standard, fragile_pick_pack,
 *    specific_pick_pack, consolidation, management
 *
 *  ⚠️  TOUTES LES VALEURS CI-DESSOUS SONT DES EXEMPLES.
 *  ⚠️  À RENSEIGNER PAR ISITEC avant toute utilisation commerciale.
 * ============================================================================
 */
import type { Machine } from '../engine/types';

export const MACHINES: Machine[] = [
  {
    id: 'sorter-crossbelt',
    name: 'ISITEC SortLine', // À RENSEIGNER PAR ISITEC
    description: 'Trieur automatique haute cadence avec mise en bac par destination.', // À RENSEIGNER PAR ISITEC
    type: 'tri',
    maxThroughput: 6000, // À RENSEIGNER PAR ISITEC (unités/h)
    outputs: 150, // À RENSEIGNER PAR ISITEC
    productivities: {
      picking_standard: 380, // À RENSEIGNER PAR ISITEC – picking batch alimentant le trieur
      consolidation: 200, // À RENSEIGNER PAR ISITEC
    },
    removedPosts: ['sorting_standard'], // À RENSEIGNER PAR ISITEC
    capex: 1_200_000, // À RENSEIGNER PAR ISITEC (€)
    opexYear: 60_000, // À RENSEIGNER PAR ISITEC (€/an)
  },
  {
    id: 'put-wall',
    name: 'ISITEC PickWall', // À RENSEIGNER PAR ISITEC
    description: 'Mur de préparation put-to-light pour la préparation de commandes multi-références.', // À RENSEIGNER PAR ISITEC
    type: 'preparation',
    maxThroughput: 2500, // À RENSEIGNER PAR ISITEC (unités/h)
    outputs: 60, // À RENSEIGNER PAR ISITEC
    productivities: {
      picking_standard: 250, // À RENSEIGNER PAR ISITEC
      sorting_standard: 1800, // À RENSEIGNER PAR ISITEC
      specific_pick_pack: 400, // À RENSEIGNER PAR ISITEC
    },
    removedPosts: [], // À RENSEIGNER PAR ISITEC
    capex: 450_000, // À RENSEIGNER PAR ISITEC (€)
    opexYear: 25_000, // À RENSEIGNER PAR ISITEC (€/an)
  },
  {
    id: 'auto-packer',
    name: 'ISITEC PackLine', // À RENSEIGNER PAR ISITEC
    description: 'Ligne de packing automatisée : mise en carton sur mesure, fermeture et étiquetage.', // À RENSEIGNER PAR ISITEC
    type: 'packing',
    maxThroughput: 1200, // À RENSEIGNER PAR ISITEC (unités/h)
    outputs: 4, // À RENSEIGNER PAR ISITEC
    productivities: {
      fragile_pick_pack: 180, // À RENSEIGNER PAR ISITEC
      specific_pick_pack: 500, // À RENSEIGNER PAR ISITEC
      consolidation: 250, // À RENSEIGNER PAR ISITEC
    },
    removedPosts: [], // À RENSEIGNER PAR ISITEC
    capex: 650_000, // À RENSEIGNER PAR ISITEC (€)
    opexYear: 35_000, // À RENSEIGNER PAR ISITEC (€/an)
  },
];

export function findMachine(id: string): Machine {
  return MACHINES.find((m) => m.id === id) ?? MACHINES[0];
}
