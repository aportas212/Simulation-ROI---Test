import type { Dictionary } from './fr';

/**
 * English dictionary – structure ready, to be completed.
 * Missing keys fall back to French automatically.
 */
export const en: Partial<Dictionary> = {
  'app.title': 'ROI Simulation',
  'app.subtitle': 'Intralogistics: sorting, order picking, packing',
  'steps.volumes': 'Volumes',
  'steps.flows': 'Throughput & outputs',
  'steps.staffing': 'Operators & costs',
  'steps.machine': 'ISITEC solution',
  'nav.previous': 'Previous',
  'nav.next': 'Next',
  'nav.results': 'See results',
  'results.title': 'Your results',
  'results.notProfitable': 'Not profitable with these assumptions',
};
