/** Textes de synthèse partagés par la page résultats, l'aperçu et le PDF. */
import type { RoiResult, SimulationInputs, SimulationResult } from '../engine/types';
import type { TFunction } from '../i18n';
import type { Formatters } from './format';

/** Délai de retour affiché : « n mois », « Non rentable… » ou « Prix sur devis ». */
export function paybackLabel(t: TFunction, f: Formatters, roi: RoiResult): string {
  if (roi.paybackMonths !== null) return t('results.kpi.paybackValue', { months: f.number(roi.paybackMonths) });
  if (!roi.priceKnown && roi.profitable) return t('results.priceOnRequest');
  return t('results.notProfitable');
}

export function buildSynthesis(t: TFunction, f: Formatters, inputs: SimulationInputs, result: SimulationResult): string {
  const { roi } = result;
  const machine = result.machineQuantity > 1 ? `${result.machineQuantity} × ${result.machine.name}` : result.machine.name;
  const params = {
    machine,
    orders: f.integer(inputs.volumes.ordersPerDayFuture),
    operators: f.number(roi.operatorsSaved),
    savings: f.euro(roi.annualSavings),
    months: f.number(roi.paybackMonths ?? 0),
  };
  if (!roi.profitable) return t('results.synthesisNotProfitable', params);
  return roi.paybackMonths !== null ? t('results.synthesis', params) : t('results.synthesisNoPrice', params);
}
