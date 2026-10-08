/**
 * Identité ISITEC utilisée dans l'application et la synthèse PDF.
 * ⚠️  Coordonnées et couleurs À VÉRIFIER / AJUSTER PAR ISITEC (charte graphique officielle).
 */
export const BRAND = {
  name: 'ISITEC',
  nameSuffix: 'International',
  tagline: 'Intégrateur de solutions intralogistiques : tri, préparation de commandes, packing',
  address: '252 rue de Guenas, Parc des Ayats, 69390 Millery, France', // À VÉRIFIER
  website: 'www.isitec-international.com', // À VÉRIFIER
  email: '', // ex. contact@... – À RENSEIGNER
  phone: '', // ex. +33 4 .. .. .. .. – À RENSEIGNER
  /** Couleurs du PDF (hexadécimal). Garder --accent de src/index.css aligné sur `accent`. */
  colors: {
    navy: '#0B2545', // bandeaux, titres
    accent: '#005CA9', // chiffres clés, scénario ISITEC
    manual: '#D97706', // scénario manuel
    current: '#7A8BB0', // situation actuelle
    ink: '#0F172A',
    muted: '#64748B',
    line: '#E2E8F0',
    soft: '#E8F1FA',
    success: '#047857',
  },
} as const;
