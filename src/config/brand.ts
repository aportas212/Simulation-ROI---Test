/**
 * Identité ISITEC utilisée dans l'application et la synthèse PDF.
 * Couleur principale relevée sur le logo officiel (#151A6A). Coordonnées : catalogue E-COM RETAIL 3PL 2025.
 */
export const BRAND = {
  name: 'ISITEC',
  nameSuffix: 'International',
  tagline: 'Vos solutions logistiques Plug & Play B2C & B2B',
  address: '252 rue de Guenas, Parc des Ayats, 69390 Millery, France',
  website: 'www.isitec-international.com',
  email: 'info@isitec-international.com',
  phone: '+33 (0)4 28 29 15 26', // numéro du catalogue E-COM RETAIL 3PL 2025 – À VÉRIFIER
  /** Couleurs du PDF (hexadécimal). Garder --accent de src/index.css aligné sur `accent`. */
  colors: {
    navy: '#151A6A', // bleu ISITEC (logo) : bandeaux, titres
    accent: '#151A6A', // chiffres clés, scénario ISITEC
    manual: '#D97706', // scénario manuel
    current: '#7A8BB0', // situation actuelle
    ink: '#0F172A',
    muted: '#64748B',
    line: '#E2E8F0',
    soft: '#ECEDF7',
    stripe: '#4B53C2', // liseré sous les bandeaux
    success: '#047857',
  },
} as const;
