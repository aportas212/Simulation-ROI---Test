# ISITEC International – Simulation ROI

Application web de simulation de retour sur investissement pour les solutions intralogistiques ISITEC
(tri, préparation de commandes, packing). Destinée aux clients retail, e-commerce et 3PL, elle est
utilisable en autonomie ou sur tablette par un commercial en rendez-vous.

Le client saisit ses données d'exploitation en 4 étapes et obtient immédiatement :

- son coût actuel de main-d'œuvre,
- ce coût projeté à volume futur s'il garde son process manuel,
- le coût avec une machine ISITEC (main-d'œuvre + coûts annuels machine),
- le ROI : économie annuelle, délai de retour, gain cumulé sur l'horizon, ROI %,
- ce que la machine apporte : opérateurs en moins, capacité utilisée, sorties, postes supprimés ou allégés.

## Stack

- Vite + React 18 + TypeScript + Tailwind CSS
- Recharts (graphiques), react-to-print (export PDF A4)
- Vitest (tests unitaires du moteur)
- Aucun backend : simulations, brouillon et demandes d'étude sont stockés en `localStorage`

## Installation et lancement

Prérequis : Node.js 18 ou plus.

```bash
npm install        # installe les dépendances
npm run dev        # lance l'application sur http://localhost:5173
npm test           # lance les tests unitaires du moteur de calcul
npm run build      # vérifie les types et construit la version de production dans dist/
npm run preview    # sert la version de production localement
```

Le dossier `dist/` est un site statique : il peut être déposé sur n'importe quel hébergement web.

## Organisation du code

```
src/
├── engine/                 Moteur de calcul : fonctions pures, sans dépendance à l'UI
│   ├── types.ts            Types des entrées / sorties
│   ├── calculations.ts     Formules (dérivés, effectifs, 3 scénarios, ROI, contrôles)
│   └── calculations.test.ts  Tests (dont le cas de test obligatoire)
├── config/
│   ├── machines.ts         ⚙️  Catalogue des machines ISITEC (à renseigner)
│   └── defaults.ts         Valeurs par défaut du formulaire et des postes
├── i18n/                   Traductions (fr complet ; en / es prêts à compléter)
├── lib/                    Formatage des nombres, stockage local, export CSV
└── components/             Formulaire en 4 étapes, page résultats, graphiques
```

## Modifier le catalogue des machines (`src/config/machines.ts`)

Le fichier contient un tableau `MACHINES`. Chaque machine est un objet :

```ts
{
  id: 'sorter-crossbelt',          // identifiant unique, sans espace
  name: 'ISITEC SortLine',         // nom affiché
  description: 'Trieur automatique…',
  type: 'tri',                     // 'tri' | 'preparation' | 'packing'
  maxThroughput: 6000,             // cadence max (unités/heure)
  outputs: 150,                    // nombre de sorties / destinations
  productivities: {                // nouvelles productivités opérateur / heure
    picking_standard: 380,         //   pour les postes modifiés par la machine
    consolidation: 200,
  },
  removedPosts: ['sorting_standard'], // postes supprimés (effectif = 0)
  capex: 1_200_000,                // investissement (€)
  opexYear: 60_000,                // maintenance + énergie + licences (€/an)
}
```

Identifiants de postes utilisables dans `productivities` et `removedPosts` :

| Identifiant          | Poste                                | Unité de productivité |
|----------------------|--------------------------------------|-----------------------|
| `picking_standard`   | Picking produits standard (batch)    | pièces / h            |
| `sorting_standard`   | Tri et mise en bac standard          | pièces / h            |
| `fragile_pick_pack`  | Pick & pack fragile / gros volume    | pièces / h            |
| `specific_pick_pack` | Pick & pack produits spécifiques     | pièces / h            |
| `consolidation`      | Consolidation et palettisation       | bacs / h              |
| `management`         | Encadrement                          | managers par équipe   |

Pour ajouter une machine, copiez un bloc existant, changez l'`id` et les valeurs, puis enregistrez :
elle apparaît automatiquement à l'étape 4. Un poste absent de `productivities` et de `removedPosts`
conserve la productivité manuelle du client.

> ⚠️ Les 3 machines fournies sont des **exemples** : toutes les valeurs sont marquées
> `À RENSEIGNER PAR ISITEC` et doivent être remplacées par les données réelles.

Après modification, lancez `npm test && npm run build` pour vérifier que tout compile.

## Autres réglages

- **Couleur d'accent** : variables CSS `--accent`, `--accent-dark`, `--accent-soft` en tête de
  `src/index.css` (triplets RGB). Les graphiques reprennent automatiquement `--accent` pour le scénario ISITEC.
- **Valeurs par défaut** (volumes, productivités, coût opérateur, horizon) : `src/config/defaults.ts`.
- **Textes et langues** : `src/i18n/fr.ts`. Les fichiers `en.ts` et `es.ts` ont la même structure ;
  toute clé manquante retombe sur le français. Langue sélectionnable avec `?lang=en` ou `?lang=es` dans l'URL.

## Règles de calcul

```
produits_jour   = commandes_jour × produits_par_commande
produits_heure  = produits_jour / heures_jour
bacs_heure      = (commandes_jour × bacs_par_commande) / heures_jour
débit_catégorie = produits_heure × part_mix_catégorie

effectif_équipe = débit_cible / productivité   (0 si productivité ≤ 0 ou débit = 0)
encadrement     : effectif_équipe = managers_par_équipe
effectif_jour   = effectif_équipe × nb_équipes
jours_hommes_an = effectif_jour × jours_par_an
coût_annuel     = effectif_jour × coût_opérateur_an
coût_horizon    = coût_annuel × horizon_années
```

Scénarios : **A** actuel (volumes actuels, productivités manuelles ou effectifs saisis),
**B** futur manuel (volumes futurs, débits recalculés depuis les produits/heure),
**C** futur ISITEC (productivités machine, postes supprimés à 0).

```
économie_annuelle     = coût_annuel_B − (coût_annuel_C + opex_machine)
payback_mois          = capex / économie_annuelle × 12   ("Non rentable avec ces hypothèses" si économie ≤ 0)
gain_cumulé           = économie_annuelle × horizon − capex
ROI_%                 = gain_cumulé / capex × 100
opérateurs_économisés = effectif_jour_B − effectif_jour_C
```

Précisions :
- Si le client saisit son effectif actuel, la productivité réelle implicite (débit actuel ÷ effectif)
  est utilisée pour projeter les scénarios B et C sur les postes non modifiés par la machine.
- Avec plusieurs machines, capex, opex, cadence et sorties sont multipliés par le nombre de machines.
- Le débit de pointe est pré-calculé (produits/heure au volume futur) et sert au contrôle de capacité.
- Sans aucune activité (volume nul), l'encadrement est également ramené à 0.

Contrôles non bloquants affichés : somme des débits par catégorie ≠ produits/heure (mix ≠ 100 %),
débit de pointe > cadence de la machine (avec nombre de machines suggéré), sorties nécessaires > sorties
disponibles.

### Cas de test de référence

3 000 commandes/jour, 20 produits/commande, 15 h/jour, 2 équipes, 300 jours/an, 20 000 €/opérateur/an,
mix 82,5 / 12,5 / 5 %, productivités 380 / 1 000 / 380 / 250 / 150 bacs/h / 1 manager par équipe :
**16,4 opérateurs par équipe, 32,9 par jour, 9 860 jours-hommes/an, 657 k€/an** (vérifié dans
`src/engine/calculations.test.ts`).

## Données locales

| Clé `localStorage`        | Contenu                                           |
|---------------------------|---------------------------------------------------|
| `isitec-roi:draft`        | saisie en cours (restaurée au rechargement)       |
| `isitec-roi:simulations`  | simulations enregistrées (« Mes simulations »)    |
| `isitec-roi:leads`        | demandes d'étude détaillée (export CSV via l'en-tête « Demandes ») |

Ces données restent sur l'appareil du navigateur utilisé.
