/**
 * ============================================================================
 *  CATALOGUE DES MACHINES ISITEC – gamme E-COM / RETAIL / 3PL
 * ============================================================================
 *  Données issues des documents commerciaux ISITEC (OneDrive, kit commercial) :
 *   - Offres standards ISIWALL 2D (13 et 26 sorties, 04-06/08/2026)
 *   - Offres standards ISIWALL 3D (27, 60, 100 sorties, 03-05/08/2026)
 *   - Offres ISIBAGGER 600 et 600 D (03/08/2026), ISI.ECOPACK 600 (22/09/2026)
 *   - Catalogue E-COM RETAIL 3PL FR 2025 11 01, brochures ISIWALL 2D / 3D
 *
 *  Ce fichier se modifie sans toucher au code de l'interface. Champs :
 *    capex            : prix catalogue € HT par machine (null = « sur devis » :
 *                       le commercial saisit alors l'investissement à l'étape 5)
 *    opexYear         : coûts annuels € HT (contrat de hotline 9 200 €/an)
 *    maxThroughput    : cadence max, en pièces/h (tri) ou commandes/h (packing)
 *    operatorsPerShift: opérateurs de conduite par machine et par équipe
 *    productivities   : nouvelles productivités opérateur des postes modifiés
 *                       (clé = id de poste, voir src/config/defaults.ts)
 *    removedPosts     : postes supprimés par la machine
 *    assumptions      : hypothèses du simulateur quand les documents ne disent rien
 *                       → À CONFIRMER PAR ISITEC
 *
 *  Identifiants de postes : picking_standard, sorting_standard, fragile_pick_pack,
 *  specific_pick_pack, consolidation, packing, management
 * ============================================================================
 */
import type { Machine, PostInput } from '../engine/types';
import imgIsiwall2d from '../assets/products/isiwall-2d.jpg';
import imgIsiwall3d from '../assets/products/isiwall-3d.jpg';
import imgIsibagger from '../assets/products/isibagger.jpg';
import imgEcopack from '../assets/products/isi-ecopack.jpg';
import imgAmr from '../assets/products/amr-sorter.jpg';

/** Contrat de hotline, identique dans toutes les offres standards. */
const HOTLINE = 9_200;

/**
 * Poste « Emballage et étiquetage » ajouté automatiquement quand une machine de packing est choisie.
 * Productivité manuelle déduite de l'offre ISIBAGGER : 6 s par colis en machine, « 2,5 fois moins
 * de temps qu'en manuel » → 15 s par colis en manuel → 240 commandes/h/opérateur.
 */
export const PACKING_POST: PostInput = {
  id: 'packing',
  label: 'Emballage et étiquetage des colis',
  unit: 'orders',
  flow: 'orders',
  productivity: 240,
  currentHeadcount: null,
};

const ISIWALL_HIGHLIGHTS = [
  'Qualité de préparation 99,9 %, sans erreur de tri',
  'Une seule injection, plusieurs commandes préparées simultanément',
  'Flux continu : étagères mobiles vidées sans arrêter le tri',
  'Installation et formation en 1 à 2 semaines, plug and play',
];

const ISIWALL_ASSUMPTION =
  'Le tri manuel par commande est supprimé ; 1 opérateur d’injection par machine et par équipe (injection manuelle).';

export const MACHINES: Machine[] = [
  // ─────────────── TRI : ISIWALL 3D ───────────────
  {
    id: 'isiwall-3d-60',
    family: 'ISIWALL 3D',
    name: 'ISIWALL 3D – 60 sorties',
    description:
      'Trieuse automatique en trois dimensions : tri des commandes ou des retours dans des bacs disposés sur étagères mobiles.',
    type: 'tri',
    image: imgIsiwall3d,
    maxThroughput: 1_500,
    throughputUnit: 'pieces',
    outputs: 60,
    operatorsPerShift: 1, // À CONFIRMER : nombre d'injecteurs non indiqué dans l'offre
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: 85_000,
    opexYear: HOTLINE,
    highlights: ISIWALL_HIGHLIGHTS,
    specs: [
      ['Bacs', '3 étagères mobiles de 20 bacs'],
      ['Articles', '100–400 × 100–300 × 10–200 mm, 0,1 à 3 kg'],
      ['Délai', '4 mois'],
      ['Transport', 'non inclus'],
    ],
    assumptions: [ISIWALL_ASSUMPTION],
    source: 'Offre standard ISIWALL 3D 60 sorties, 03/08/2026',
  },
  {
    id: 'isiwall-3d-100',
    family: 'ISIWALL 3D',
    name: 'ISIWALL 3D – 100 sorties',
    description:
      'Trieuse automatique en trois dimensions grande capacité, prête pour le packing : 100 bacs sur 4 étagères mobiles.',
    type: 'tri',
    image: imgIsiwall3d,
    maxThroughput: 2_000,
    throughputUnit: 'pieces',
    outputs: 100,
    operatorsPerShift: 1, // À CONFIRMER
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: 120_000,
    opexYear: HOTLINE,
    highlights: ['Jusqu’à 2 000 pièces triées par heure', ...ISIWALL_HIGHLIGHTS.slice(0, 3)],
    specs: [
      ['Bacs', '4 étagères mobiles de 25 bacs'],
      ['Articles', '100–400 × 100–300 × 10–120 mm, 0,1 à 5 kg'],
      ['Encombrement', 'L 5 624 × l 2 750 × H 2 350 mm'],
      ['Délai', '4 mois'],
    ],
    assumptions: [ISIWALL_ASSUMPTION],
    source: 'Offre standard ISIWALL 3D 100 sorties, 05/08/2026',
  },
  {
    id: 'isiwall-3d-27',
    family: 'ISIWALL 3D',
    name: 'ISIWALL 3D – 27 sorties',
    description: 'Version compacte de l’ISIWALL 3D : 27 bacs sur 3 étagères mobiles, environ 7 m² au sol.',
    type: 'tri',
    image: imgIsiwall3d,
    maxThroughput: 1_500,
    throughputUnit: 'pieces',
    outputs: 27,
    operatorsPerShift: 1, // À CONFIRMER
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: null, // « X € HT » dans l'offre standard → sur devis
    opexYear: HOTLINE,
    highlights: ['Machine disponible à Millery', ...ISIWALL_HIGHLIGHTS.slice(0, 3)],
    specs: [
      ['Bacs', '3 étagères mobiles de 9 bacs'],
      ['Encombrement', 'L 2 900 × l 2 400 × H 1 900 mm (≈ 7 m²)'],
      ['Transport', 'inclus'],
    ],
    assumptions: [ISIWALL_ASSUMPTION],
    source: 'Offre standard ISIWALL 3D 27 sorties, 03/08/2026',
  },

  // ─────────────── TRI : ISIWALL 2D ───────────────
  {
    id: 'isiwall-2d-13',
    family: 'ISIWALL 2D',
    name: 'ISIWALL 2D – 13 sorties',
    description:
      'Trieuse automatique en bacs pour la préparation multi-commandes (pick then pack), les retours et le tri transporteurs.',
    type: 'tri',
    image: imgIsiwall2d,
    maxThroughput: 1_500, // cadence opérationnelle 1 100 à 1 200 pph (fiche technique)
    throughputUnit: 'pieces',
    outputs: 13,
    operatorsPerShift: 1,
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: null, // « X € HT » dans l'offre standard → sur devis
    opexYear: HOTLINE,
    highlights: [
      'Jusqu’à 1 500 pièces/h (1 100 à 1 200 en opérationnel)',
      'Caisse, bac, sac ou chariot en sortie',
      'Articles jusqu’à 10 kg',
      'Testable chez ISITEC à Millery',
    ],
    specs: [
      ['Encombrement', 'L 4 211 × l 4 200 × H 2 004 mm (≈ 18 m²)'],
      ['Articles', '100–400 × 100–300 × 10–300 mm, 0,1 à 10 kg'],
      ['Délai', '4 mois'],
      ['Transport', 'inclus'],
    ],
    assumptions: [ISIWALL_ASSUMPTION],
    source: 'Offre standard ISIWALL 2D 13 sorties, 04/08/2026 ; fiche technique 01/03/2026',
  },
  {
    id: 'isiwall-2d-26',
    family: 'ISIWALL 2D',
    name: 'ISIWALL 2D – 26 sorties',
    description:
      'Deux trieuses ISIWALL 2D en vis-à-vis, alimentées par une injection centrale réalisée par un opérateur.',
    type: 'tri',
    image: imgIsiwall2d,
    maxThroughput: 1_500,
    throughputUnit: 'pieces',
    outputs: 26,
    operatorsPerShift: 1, // « une injection centrale réalisée manuellement par un opérateur »
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: null, // « X € HT » dans l'offre standard → sur devis
    opexYear: HOTLINE,
    highlights: [
      '26 sorties pour une seule injection',
      'Qualité de préparation 99,9 %',
      'Caisse, bac, sac ou chariot en sortie',
      'Installation et formation en 1 à 2 semaines',
    ],
    specs: [
      ['Encombrement', 'L 7 700 × l 4 211 × H 2 004 mm (≈ 33 m²)'],
      ['Articles', '100–400 × 100–300 × 10–300 mm, 0,1 à 10 kg'],
      ['Délai', '4 mois'],
      ['Transport', 'inclus'],
    ],
    assumptions: ['Le tri manuel par commande est supprimé ; 1 opérateur à l’injection centrale par équipe.'],
    source: 'Offre standard ISIWALL 2D 26 sorties, 06/08/2026',
  },

  // ─────────────── TRI : AMR SORTER ───────────────
  {
    id: 'amr-sorter',
    family: 'AMR SORTER',
    name: 'AMR SORTER',
    description:
      'Tri par robots mobiles autonomes, de 800 à 8 000 pièces/h, pour vagues de plusieurs centaines de commandes et colis non convoyables.',
    type: 'tri',
    image: imgAmr,
    maxThroughput: 8_000,
    throughputUnit: 'pieces',
    outputs: null, // « de 10 à plusieurs centaines » selon configuration
    operatorsPerShift: 1, // À CONFIRMER
    productivities: {},
    removedPosts: ['sorting_standard'],
    capex: null, // sur devis
    opexYear: 0, // À RENSEIGNER PAR ISITEC
    highlights: [
      'Architecture modulaire et évolutive',
      'Sorties : de 10 à plusieurs centaines',
      'Colis jusqu’à 600 × 400 mm et 30 kg',
      'Haut taux de disponibilité grâce aux AMR',
    ],
    specs: [
      ['Cadence', '800 à 8 000 pièces/h'],
      ['Contenants', 'caisse, bac, sac, palbox, roll, chariot'],
      ['Installation', 'plus de 2 semaines'],
    ],
    assumptions: [
      'Configuration sur mesure : nombre de sorties, prix et coûts annuels à renseigner.',
      'Le tri manuel par commande est supprimé ; 1 opérateur d’injection par équipe (à confirmer).',
    ],
    source: 'Catalogue E-COM RETAIL 3PL ISITEC FR, 01/11/2025',
  },

  // ─────────────── PACKING ───────────────
  {
    id: 'isibagger-600',
    family: 'ISIBAGGER',
    name: 'ISIBAGGER 600',
    description:
      'Packing automatique en enveloppe papier ou plastique avec étiquette transport, en 6 secondes, sans air comprimé.',
    type: 'packing',
    image: imgIsibagger,
    maxThroughput: 600,
    throughputUnit: 'orders',
    outputs: null,
    operatorsPerShift: 0,
    // Pick → Scan → Drop : l'opérateur alimente la machine à sa cadence (600 commandes/h)
    productivities: { packing: 600 },
    removedPosts: [],
    capex: 55_500, // convoyeur de sortie inclus (4 500 € HT)
    opexYear: HOTLINE,
    highlights: [
      '600 commandes/h, 2,5 fois plus rapide qu’en manuel',
      'Pick → Scan → Drop : 3 étapes au lieu de 15',
      'Enveloppe scellée + étiquette transport en une passe',
      'Installation et formation en 2 jours',
    ],
    specs: [
      ['Encombrement', 'L 2 083 × l 1 010 × H 1 650 mm (≈ 2 m²)'],
      ['Énergie', '220 V – 3,2 kW, sans air comprimé'],
      ['Délai', 'disponible immédiatement'],
      ['Prix', 'convoyeur inclus, hors transport et consommables'],
    ],
    assumptions: ['Remplace l’emballage et l’étiquetage manuels ; consommables non inclus dans le calcul.'],
    source: 'Offre ISIBAGGER 600, 03/08/2026',
  },
  {
    id: 'isibagger-600d',
    family: 'ISIBAGGER',
    name: 'ISIBAGGER 600 D',
    description:
      'Packing automatique en enveloppe sur mesure (papier, plastique ou bulle) depuis une bobine, avec étiquette transport.',
    type: 'packing',
    image: imgIsibagger,
    maxThroughput: 600,
    throughputUnit: 'orders',
    outputs: null,
    operatorsPerShift: 0,
    productivities: { packing: 600 },
    removedPosts: [],
    capex: 140_000, // transport inclus, convoyeur de sortie en option
    opexYear: HOTLINE,
    highlights: [
      'Emballage sur mesure, longueur ajustée automatiquement',
      'Consommables en rouleau, moins de rebut (RSE)',
      '600 commandes/h avec étiquette transport',
      'Installation et formation en 5 jours',
    ],
    specs: [
      ['Encombrement', 'L 1 929 × l 1 755 × H 2 842 mm (≈ 4 m²)'],
      ['Délai', '4 mois'],
      ['Prix', 'transport inclus, convoyeur en option'],
    ],
    assumptions: ['Remplace l’emballage et l’étiquetage manuels ; consommables non inclus dans le calcul.'],
    source: 'Offre ISIBAGGER 600 D, 03/08/2026',
  },
  {
    id: 'isi-ecopack-600',
    family: 'ISI.ECOPACK',
    name: 'ISI.ECOPACK 600',
    description:
      'Fermeuse automatique de cartons à hauteur minimale : ajustement, pliage et collage à chaud en 6 secondes par colis.',
    type: 'packing',
    image: imgEcopack,
    maxThroughput: 600,
    throughputUnit: 'orders',
    outputs: null,
    operatorsPerShift: 0,
    productivities: { packing: 600 },
    removedPosts: [],
    capex: null, // montant non renseigné dans l'offre → sur devis
    opexYear: HOTLINE,
    highlights: [
      'Jusqu’à −30 % de volume transporté et facturé',
      'Plus de calage ni de fermeture manuelle',
      'Cartons standards du marché, sans consommable propriétaire',
      'Option ISIFEED 1800 : formage automatique des cartons',
    ],
    specs: [
      ['Cartons', 'L 400–500 × l 300–400 × H 85–455 mm'],
      ['Encombrement', 'L 4 260 × l 3 200 × H 3 220 mm (≈ 13 m²)'],
      ['Délai', '4 mois'],
    ],
    assumptions: [
      'Remplace la fermeture et le calage manuels ; la baisse de 30 % du coût transport n’est pas comptée.',
    ],
    source: 'Offre ISI.ECOPACK 600, 22/09/2026',
  },
];

export function findMachine(id: string): Machine {
  return MACHINES.find((m) => m.id === id) ?? MACHINES[0];
}

/** Familles affichées comme filtres à l'étape « Solution ISITEC ». */
export const MACHINE_TYPES: Machine['type'][] = ['tri', 'packing'];
