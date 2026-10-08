/**
 * Synthèse PDF A4 (2 pages) aux couleurs ISITEC, générée avec jsPDF (vrai fichier PDF, sans impression).
 * Page 1 : client, gain annuel, chiffres clés, coûts, coût cumulé, apports de la solution.
 * Page 2 : détail par poste, données saisies, prochaines étapes et contact.
 */
import { jsPDF } from 'jspdf';
import { BRAND } from '../config/brand';
import type { ScenarioKey, SimulationInputs, SimulationResult } from '../engine/types';
import type { TFunction } from '../i18n';
import type { Formatters } from '../lib/format';
import { saveFile, type SaveOutcome } from '../lib/download';
import { buildSynthesis, paybackLabel } from '../lib/summary';
import logoWhiteUrl from '../assets/logo-isitec-white.png';

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14; // marge
const CONTENT_W = PAGE_W - 2 * M;
const C = BRAND.colors;

type RGB = [number, number, number];
function rgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Les polices standard PDF ne gèrent pas l'espace fine insécable produite par Intl (fr-FR) :
 * on la remplace par l'espace insécable classique (gérée, et qui évite de couper « 1 691 930 € »).
 */
export function pdfText(s: string): string {
  return s
    .replace(/[\u202f\u2009]/g, '\u00a0')
    .replace(/\u2192/g, '>')
    .replace(/\u2212/g, '-');
}

/** Images déjà chargées (data URL) : logo blanc pour les bandeaux, photo de la machine. */
export interface ReportImages {
  logoWhite?: string;
  machine?: string;
}

interface ReportOptions {
  inputs: SimulationInputs;
  result: SimulationResult;
  t: TFunction;
  f: Formatters;
  date?: Date;
  images?: ReportImages;
}

function imageFormat(dataUrl: string) {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

/** Place une image dans un cadre en conservant ses proportions ; renvoie la largeur utilisée. */
function drawContained(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number, align: 'left' | 'center' = 'center') {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = Math.min(w / props.width, h / props.height);
    const iw = props.width * ratio;
    const ih = props.height * ratio;
    const ix = align === 'left' ? x : x + (w - iw) / 2;
    doc.addImage(dataUrl, imageFormat(dataUrl), ix, y + (h - ih) / 2, iw, ih, undefined, 'FAST');
    return iw;
  } catch {
    return 0;
  }
}

class Pdf {
  doc: jsPDF;
  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  }
  fill(hex: string) {
    this.doc.setFillColor(...rgb(hex));
  }
  stroke(hex: string) {
    this.doc.setDrawColor(...rgb(hex));
  }
  font(size: number, weight: 'normal' | 'bold' = 'normal', color: string = C.ink) {
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...rgb(color));
  }
  text(s: string, x: number, y: number, opts: { align?: 'left' | 'right' | 'center'; spacing?: number } = {}) {
    this.doc.setCharSpace(opts.spacing ?? 0);
    this.doc.text(pdfText(s), x, y, { align: opts.align ?? 'left' });
    this.doc.setCharSpace(0);
  }
  /** Texte sur plusieurs lignes ; renvoie la hauteur utilisée. */
  para(s: string, x: number, y: number, width: number, lineHeight: number, maxLines = 99) {
    const lines = this.doc.splitTextToSize(pdfText(s), width) as string[];
    const shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/\s+\S*$/, '')}…`;
    shown.forEach((l, i) => this.doc.text(l, x, y + i * lineHeight));
    return shown.length * lineHeight;
  }
  /** Coupe un texte trop long pour la largeur donnée. */
  fit(s: string, width: number) {
    const clean = pdfText(s);
    if (this.doc.getTextWidth(clean) <= width) return clean;
    let out = clean;
    while (out.length > 1 && this.doc.getTextWidth(`${out}…`) > width) out = out.slice(0, -1);
    return `${out.trimEnd()}…`;
  }
  label(s: string, x: number, y: number, color: string = C.muted, align: 'left' | 'right' = 'left') {
    this.font(6.8, 'bold', color);
    this.text(s.toUpperCase(), x, y, { spacing: 0.35, align });
  }
  logo(x: number, y: number, size: number, onDark: boolean) {
    const d = this.doc;
    this.fill(C.accent);
    d.roundedRect(x, y, size, size, size * 0.18, size * 0.18, 'F');
    this.fill('#FFFFFF');
    const u = size / 32;
    d.rect(x + 9 * u, y + 8 * u, 4 * u, 16 * u, 'F');
    d.rect(x + 16 * u, y + 8 * u, 7 * u, 4 * u, 'F');
    d.rect(x + 16 * u, y + 14 * u, 7 * u, 4 * u, 'F');
    d.rect(x + 16 * u, y + 20 * u, 7 * u, 4 * u, 'F');
    const tx = x + size + 3;
    const ty = y + size * 0.68;
    this.font(size * 1.25, 'bold', onDark ? '#FFFFFF' : C.navy);
    this.text(BRAND.name, tx, ty);
    const w = d.getTextWidth(BRAND.name);
    this.font(size * 1.25, 'normal', onDark ? '#B9C7DA' : C.muted);
    this.text(` ${BRAND.nameSuffix}`, tx + w, ty);
  }
}

function scenarioLabel(t: TFunction, k: ScenarioKey) {
  return t(k === 'A' ? 'results.costs.current' : k === 'B' ? 'results.costs.futureManual' : 'results.costs.futureIsitec');
}

function footer(p: Pdf, t: TFunction, page: number, total: number) {
  const y = PAGE_H - 12;
  p.font(6.5, 'normal', C.muted);
  p.para(t('pdf.disclaimer'), M, y - 6, CONTENT_W, 3);
  p.stroke(C.line);
  p.doc.setLineWidth(0.3);
  p.doc.line(M, y - 2.5, PAGE_W - M, y - 2.5);
  p.font(7, 'bold', C.navy);
  const brand = `${BRAND.name} ${BRAND.nameSuffix}`;
  p.text(brand, M, y + 1.5);
  const bw = p.doc.getTextWidth(brand);
  p.font(7, 'normal', C.muted);
  const contact = [BRAND.address, BRAND.website, BRAND.phone].filter(Boolean).join('  ·  ');
  p.text(`  ·  ${p.fit(contact, CONTENT_W - bw - 25)}`, M + bw, y + 1.5);
  p.text(t('pdf.page', { page, total }), PAGE_W - M, y + 1.5, { align: 'right' });
}

export function buildRoiReport({ inputs, result, t, f, date = new Date(), images = {} }: ReportOptions): jsPDF {
  const p = new Pdf();
  const d = p.doc;
  const { roi, scenarios, machine } = result;
  const client = inputs.client;
  const horizon = `${f.number(inputs.staffing.horizonYears)} ${t('unit.years')}`;
  const machineLabel = result.machineQuantity > 1 ? `${result.machineQuantity} × ${machine.name}` : machine.name;
  const TOTAL_PAGES = 2;

  d.setProperties({
    title: `${t('pdf.docTitle')} ${BRAND.name}${client.company ? ` – ${client.company}` : ''}`,
    author: `${BRAND.name} ${BRAND.nameSuffix}`,
    subject: t('pdf.docTitle'),
  });

  // ───────────── PAGE 1 ─────────────
  // Bandeau
  p.fill(C.navy);
  d.rect(0, 0, PAGE_W, 36, 'F');
  p.fill(C.stripe);
  d.rect(0, 36, PAGE_W, 1.4, 'F');
  if (!images.logoWhite || !drawContained(d, images.logoWhite, M, 6, 60, 24, 'left')) p.logo(M, 10, 11, true);
  p.label(t('pdf.docTitle'), PAGE_W - M, 15.5, '#FFFFFF', 'right');
  p.font(9, 'normal', '#C9CCF0');
  p.text(f.date(date), PAGE_W - M, 21.5, { align: 'right' });
  p.font(7, 'normal', '#C9CCF0');
  p.text(BRAND.tagline, PAGE_W - M, 28, { align: 'right' });

  // Client et solution
  let y = 47;
  p.label(t('pdf.preparedFor'), M, y);
  p.font(15, 'bold', C.ink);
  p.text(p.fit(client.company || '—', 100), M, y + 7);
  p.font(9.5, 'normal', C.ink);
  p.text(p.fit([client.contactName, client.role].filter(Boolean).join(' · '), 100), M, y + 13);
  p.font(8.5, 'normal', C.muted);
  p.text(p.fit([client.email, client.phone].filter(Boolean).join(' · '), 100), M, y + 18);

  // Solution : photo de la machine + nom + description
  let sx = 118;
  if (images.machine) {
    p.fill('#F8FAFC');
    d.roundedRect(sx, y - 4, 30, 24, 1.5, 1.5, 'F');
    drawContained(d, images.machine, sx + 1, y - 3, 28, 22);
    sx += 34;
  }
  const solW = PAGE_W - M - sx;
  p.label(t(inputs.machineSelection === 'auto' ? 'pdf.solutionRecommended' : 'pdf.solution'), sx, y);
  p.font(11, 'bold', C.navy);
  const nameH = p.para(machineLabel, sx, y + 6.5, solW, 4.6, 2);
  p.font(7.6, 'normal', C.muted);
  p.para(machine.description, sx, y + 6.5 + nameH + 0.5, solW, 3.3, nameH > 5 ? 2 : 3);

  // Gain annuel (bloc principal)
  y = 72;
  p.fill(C.soft);
  d.roundedRect(M, y, CONTENT_W, 34, 2.5, 2.5, 'F');
  p.fill(C.accent);
  d.rect(M, y, 1.6, 34, 'F');
  p.label(t(roi.profitable ? 'pdf.heroLabel' : 'pdf.heroNotProfitable'), M + 7, y + 8, C.navy);
  p.font(28, 'bold', roi.profitable ? C.accent : '#B91C1C');
  p.text(f.euroCompact(roi.annualSavings), M + 7, y + 21);
  const bigW = d.getTextWidth(pdfText(f.euroCompact(roi.annualSavings)));
  p.font(11, 'normal', C.navy);
  p.text(t('preview.perYear', { value: '' }).trim(), M + 8 + bigW, y + 21);
  p.font(7.5, 'normal', C.muted);
  p.text(t('results.kpi.vsManual'), M + 7, y + 27.5);
  p.font(9.5, 'normal', C.ink);
  const synth = buildSynthesis(t, f, inputs, result);
  p.para(synth, 104, y + 10, PAGE_W - M - 104 - 5, 4.6, 5);

  // Chiffres clés
  y = 113;
  const kpis: { label: string; value: string; sub: string; bad?: boolean }[] = [
    {
      label: t('results.kpi.payback'),
      value: paybackLabel(t, f, roi),
      sub: t('results.kpi.capexOf', { capex: f.euroCompact(roi.capex) }),
      bad: !roi.profitable,
    },
    {
      label: t('results.kpi.gain', { horizon }),
      value: f.euroCompact(roi.cumulativeGain),
      sub: t('preview.perYear', { value: `${t('machine.opex').toLowerCase()} ${f.euroCompact(roi.opexYear)}` }),
      bad: roi.cumulativeGain < 0,
    },
    {
      label: 'ROI',
      value: roi.roiPercent !== null ? f.percent(roi.roiPercent) : '—',
      sub: t('pdf.over', { horizon }),
      bad: (roi.roiPercent ?? 0) < 0,
    },
    {
      label: t('results.kpi.operators'),
      value: f.number(roi.operatorsSaved),
      sub: t('results.kpi.perShift', { value: f.number(scenarios.B.totals.perShift - scenarios.C.totals.perShift) }),
    },
  ];
  const gap = 4;
  const kw = (CONTENT_W - gap * 3) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (kw + gap);
    p.stroke(C.line);
    d.setLineWidth(0.3);
    d.roundedRect(x, y, kw, 24, 2, 2, 'S');
    p.font(6.5, 'bold', C.muted);
    d.setCharSpace(0.25);
    // marge supplémentaire : l'interlettrage n'est pas compté par le calcul de coupure
    p.para(k.label.toUpperCase(), x + 4, y + 5.5, kw - 14, 3, 2);
    d.setCharSpace(0);
    const valueSize = k.value.length > 14 ? 10 : 15;
    p.font(valueSize, 'bold', k.bad ? '#B91C1C' : C.ink);
    p.text(p.fit(k.value, kw - 8), x + 4, y + 16);
    p.font(7, 'normal', C.muted);
    p.text(p.fit(k.sub, kw - 8), x + 4, y + 21);
  });

  // Coûts annuels des 3 scénarios
  y = 146;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.costsTitle'), M, y);
  const costs: { k: ScenarioKey; cost: number; ops: number; color: string }[] = [
    { k: 'A', cost: scenarios.A.totals.annualCost, ops: scenarios.A.totals.perDay, color: C.current },
    { k: 'B', cost: scenarios.B.totals.annualCost, ops: scenarios.B.totals.perDay, color: C.manual },
    { k: 'C', cost: scenarios.C.totals.annualCost + roi.opexYear, ops: scenarios.C.totals.perDay, color: C.accent },
  ];
  const maxCost = Math.max(1, ...costs.map((c) => c.cost));
  const barX = M + 44;
  const barMax = 86;
  costs.forEach((c, i) => {
    const ry = y + 6 + i * 9;
    p.font(8.5, c.k === 'C' ? 'bold' : 'normal', C.ink);
    p.text(scenarioLabel(t, c.k), M, ry + 4.2);
    p.fill(C.line);
    d.roundedRect(barX, ry, barMax, 6, 1, 1, 'F');
    p.fill(c.color);
    const w = Math.max(1.5, (c.cost / maxCost) * barMax);
    d.roundedRect(barX, ry, w, 6, 1, 1, 'F');
    p.font(8.5, 'bold', C.ink);
    p.text(t('pdf.perYear', { value: f.euroCompact(c.cost) }), barX + barMax + 4, ry + 4.2);
    const vw = d.getTextWidth(pdfText(t('pdf.perYear', { value: f.euroCompact(c.cost) })));
    p.font(8, 'normal', C.muted);
    p.text(`  ·  ${t('pdf.opsPerDay', { value: f.number(c.ops) })}`, barX + barMax + 4 + vw, ry + 4.2);
  });
  if (roi.opexYear > 0) {
    p.font(6.8, 'normal', C.muted);
    p.text(t('results.costs.opexIncluded', { opex: f.euroCompact(roi.opexYear) }), barX + barMax + 4, y + 6 + 2 * 9 + 8.5);
  }

  // Coût cumulé (colonne gauche)
  y = 190;
  const colW = (CONTENT_W - 8) / 2;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.cumulativeTitle', { horizon }), M, y);
  drawCumulative(p, t, f, result, M, y + 5, colW, 52);

  // Apports de la solution (colonne droite)
  const bx = M + colW + 8;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.benefitsTitle'), bx, y);
  drawBenefits(p, t, f, result, bx, y + 7, colW);

  footer(p, t, 1, TOTAL_PAGES);

  // ───────────── PAGE 2 ─────────────
  d.addPage();
  p.fill(C.navy);
  d.rect(0, 0, PAGE_W, 20, 'F');
  p.fill(C.stripe);
  d.rect(0, 20, PAGE_W, 1, 'F');
  if (!images.logoWhite || !drawContained(d, images.logoWhite, M, 3, 40, 14, 'left')) p.logo(M, 6, 8, true);
  p.font(8.5, 'normal', '#B9C7DA');
  p.text(p.fit(`${t('pdf.docTitle')}${client.company ? ` · ${client.company}` : ''}`, 90), PAGE_W - M, 11.5, { align: 'right' });

  y = 32;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.detailTitle'), M, y);
  y = drawDetailTable(p, t, f, result, M, y + 5);

  // Données saisies
  y += 10;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.assumptionsTitle'), M, y);
  y = drawAssumptions(p, t, f, inputs, result, M, y + 6);

  // Prochaines étapes + contact
  y += 8;
  p.font(11, 'bold', C.navy);
  p.text(t('pdf.nextTitle'), M, y);
  const steps = [t('pdf.next1'), t('pdf.next2'), t('pdf.next3')];
  const sw = (CONTENT_W - 8) / 3;
  steps.forEach((s, i) => {
    const x = M + i * (sw + 4);
    p.fill(C.soft);
    d.roundedRect(x, y + 4, sw, 20, 2, 2, 'F');
    p.fill(C.accent);
    d.circle(x + 7, y + 11, 3.2, 'F');
    p.font(8.5, 'bold', '#FFFFFF');
    p.text(String(i + 1), x + 7, y + 12.3, { align: 'center' });
    p.font(8.3, 'normal', C.ink);
    p.para(s, x + 13, y + 10, sw - 16, 3.8, 3);
  });

  y += 32;
  p.fill(C.navy);
  d.roundedRect(M, y, CONTENT_W, 27, 2.5, 2.5, 'F');
  p.label(t('pdf.contactUs'), M + 6, y + 7, '#B9C7DA');
  p.font(12, 'bold', '#FFFFFF');
  p.text(`${BRAND.name} ${BRAND.nameSuffix}`, M + 6, y + 13.5);
  p.font(8, 'normal', '#DCE0F5');
  p.text(p.fit(BRAND.address, CONTENT_W - 12), M + 6, y + 18.5);
  p.font(8, 'bold', '#FFFFFF');
  p.text(p.fit([BRAND.phone, BRAND.email, BRAND.website].filter(Boolean).join('   ·   '), CONTENT_W - 12), M + 6, y + 23);

  footer(p, t, 2, TOTAL_PAGES);
  return d;
}


function drawCumulative(p: Pdf, t: TFunction, f: Formatters, result: SimulationResult, x: number, y: number, w: number, h: number) {
  const d = p.doc;
  const { roi } = result;
  const pts = roi.cumulative;
  const months = pts[pts.length - 1]?.month ?? 12;
  const maxV = Math.max(1, ...pts.map((q) => Math.max(q.manual, q.isitec)));
  // Échelle « propre » pour l'axe des montants
  const step = niceStep(maxV / 3);
  const top = Math.ceil(maxV / step) * step;
  const left = x + 15;
  const right = x + w - 2;
  const plotTop = y + 3;
  const plotBot = y + h - 16;
  const sx = (m: number) => left + (m / months) * (right - left);
  const sy = (v: number) => plotBot - (v / top) * (plotBot - plotTop);

  d.setLineWidth(0.2);
  p.stroke(C.line);
  p.font(6.5, 'normal', C.muted);
  for (let v = 0; v <= top + 1e-6; v += step) {
    d.line(left, sy(v), right, sy(v));
    p.text(f.euroCompact(v), left - 2, sy(v) + 1.1, { align: 'right' });
  }
  const yearStep = months / 12 > 6 ? 2 : 1;
  for (let yr = 0; yr * 12 <= months; yr += yearStep) {
    p.text(yr === 0 ? '0' : t('results.chart.year', { year: yr }), sx(yr * 12), plotBot + 4, { align: 'center' });
  }

  const line = (key: 'manual' | 'isitec', color: string) => {
    p.stroke(color);
    d.setLineWidth(0.7);
    for (let i = 1; i < pts.length; i++) d.line(sx(pts[i - 1].month), sy(pts[i - 1][key]), sx(pts[i].month), sy(pts[i][key]));
  };
  line('manual', C.manual);
  line('isitec', C.accent);

  // Point de bascule
  let note = t('pdf.noBreakEven');
  if (roi.paybackMonths !== null && roi.paybackMonths <= months) {
    const bx = roi.paybackMonths;
    const by = roi.capex + ((result.scenarios.C.totals.annualCost + roi.opexYear) * bx) / 12;
    p.stroke(C.navy);
    d.setLineWidth(0.25);
    d.setLineDashPattern([0.8, 0.8], 0);
    d.line(sx(bx), plotTop, sx(bx), plotBot);
    d.setLineDashPattern([], 0);
    p.fill('#FFFFFF');
    p.stroke(C.navy);
    d.setLineWidth(0.6);
    d.circle(sx(bx), sy(by), 1.4, 'FD');
    note = t('pdf.breakEven', { month: f.number(bx) });
  }

  // Légende
  const ly = plotBot + 9.5;
  const legend: [string, string][] = [
    [C.manual, t('results.scenario.B')],
    [C.accent, t('results.scenario.C')],
  ];
  let lx = left;
  legend.forEach(([color, label]) => {
    p.stroke(color);
    d.setLineWidth(0.9);
    d.line(lx, ly - 1, lx + 5, ly - 1);
    p.font(7, 'normal', C.ink);
    p.text(label, lx + 6.5, ly);
    lx += 9 + d.getTextWidth(pdfText(label)) + 4;
  });
  p.font(7.2, 'bold', C.navy);
  p.text(note, left, ly + 4.5);
}

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function drawBenefits(p: Pdf, t: TFunction, f: Formatters, result: SimulationResult, x: number, y: number, w: number) {
  const d = p.doc;
  const { capacity, scenarios } = result;
  const util = capacity.utilization * 100;
  const over = util > 100;

  // Capacité
  p.label(t('pdf.capacity'), x, y);
  p.font(13, 'bold', over ? '#B91C1C' : C.ink);
  p.text(f.percent(util), x, y + 6.5);
  p.fill(C.line);
  d.roundedRect(x + 22, y + 3.2, w - 22, 2.8, 1.4, 1.4, 'F');
  p.fill(over ? '#B91C1C' : C.accent);
  d.roundedRect(x + 22, y + 3.2, Math.max(1, Math.min(1, util / 100) * (w - 22)), 2.8, 1.4, 1.4, 'F');
  p.font(7, 'normal', C.muted);
  p.text(t('results.benefits.capacityDetail', { peak: f.integer(capacity.peakThroughput), max: f.integer(capacity.installedThroughput), unit: t(`unit.${capacity.unit}`) }), x, y + 10.5);

  // Sorties
  y += 16;
  p.label(t('pdf.outputs'), x, y);
  if (capacity.outputsAvailable === null) {
    p.font(9, 'normal', C.muted);
    p.text(t('results.benefits.outputsNa'), x, y + 6);
  } else {
    const outputsOk = capacity.outputsAvailable >= capacity.outputsRequired;
    p.font(13, 'bold', outputsOk ? C.ink : '#B91C1C');
    p.text(`${f.integer(capacity.outputsAvailable)} / ${f.integer(capacity.outputsRequired)}`, x, y + 6.5);
    p.font(7, 'bold', outputsOk ? C.success : '#B91C1C');
    p.text(t(outputsOk ? 'results.benefits.outputsOk' : 'results.benefits.outputsKo'), x + 30, y + 6);
  }

  // Postes supprimés ou allégés
  y += 13;
  p.label(t('results.benefits.posts'), x, y);
  const changed = scenarios.C.posts
    .map((c, i) => ({ c, b: scenarios.B.posts[i] }))
    .filter(({ c, b }) => c.status === 'removed' || (c.status === 'modified' && c.perDay < b.perDay - 1e-9))
    .slice(0, 4);
  let ly = y + 5;
  if (changed.length === 0) {
    p.font(7.5, 'normal', C.muted);
    p.text(t('results.benefits.noPosts'), x, ly);
    ly += 4.5;
  }
  changed.forEach(({ c, b }) => {
    p.fill(c.status === 'removed' ? C.success : C.accent);
    d.circle(x + 1, ly - 1, 0.9, 'F');
    p.font(7.5, 'normal', C.ink);
    const s =
      c.status === 'removed'
        ? t('pdf.postRemoved', { label: c.label })
        : t('pdf.postReduced', { label: c.label, before: f.number(b.perDay), after: f.number(c.perDay) });
    ly += p.para(s, x + 3.5, ly, w - 4, 3.4, 2) + 1;
  });

  // Fiabilité
  ly += 2;
  p.label(t('pdf.reliability'), x, ly);
  p.font(7.5, 'normal', C.ink);
  p.para(t('pdf.reliabilityText'), x, ly + 4.5, w, 3.4, 3);
}

function drawDetailTable(p: Pdf, t: TFunction, f: Formatters, result: SimulationResult, x: number, y: number) {
  const d = p.doc;
  const keys: ScenarioKey[] = ['A', 'B', 'C'];
  const colors: Record<ScenarioKey, string> = { A: C.current, B: C.manual, C: C.accent };
  const postW = 62;
  const numW = (CONTENT_W - postW) / 6;
  const colX = (group: number, k: number) => x + postW + (group * 3 + k + 1) * numW - 2; // bord droit

  // En-têtes
  p.font(6.8, 'bold', C.muted);
  d.setCharSpace(0.25);
  p.text(t('results.table.perDay').toUpperCase(), x + postW + 1.5 * numW, y + 3, { align: 'center' });
  p.text(t('results.table.annualCost').toUpperCase(), x + postW + 4.5 * numW, y + 3, { align: 'center' });
  p.text(t('results.table.post').toUpperCase(), x, y + 8.5);
  d.setCharSpace(0);
  [0, 1].forEach((g) =>
    keys.forEach((k, i) => {
      p.fill(colors[k]);
      d.rect(colX(g, i) - 5.5, y + 6.4, 2, 2, 'F');
      p.font(7, 'bold', C.ink);
      p.text(k, colX(g, i), y + 8.5, { align: 'right' });
    }),
  );
  p.stroke(C.navy);
  d.setLineWidth(0.4);
  d.line(x, y + 10.5, x + CONTENT_W, y + 10.5);

  let ry = y + 10.5;
  const rowH = 6.4;
  result.scenarios.A.posts.forEach((post, i) => {
    const c = result.scenarios.C.posts[i];
    const b = result.scenarios.B.posts[i];
    const tag = c.status === 'removed' ? t('results.table.removed') : c.status === 'modified' && c.perDay < b.perDay - 1e-9 ? t('results.table.modified') : '';
    if (i % 2 === 1) {
      p.fill('#F8FAFC');
      d.rect(x, ry, CONTENT_W, rowH, 'F');
    }
    p.font(7.8, 'normal', C.ink);
    const label = p.fit(post.label, tag ? postW - 17 : postW - 2);
    const labelW = d.getTextWidth(label);
    p.text(label, x + 1, ry + 4.3);
    if (tag) {
      p.font(5.8, 'bold', c.status === 'removed' ? C.success : C.accent);
      p.text(tag.toUpperCase(), x + 1 + labelW + 2, ry + 4.2);
    }
    keys.forEach((k, j) => {
      const s = result.scenarios[k].posts[i];
      p.font(7.8, k === 'C' ? 'bold' : 'normal', k === 'C' ? C.ink : C.muted);
      p.text(f.number(s.perDay), colX(0, j), ry + 4.3, { align: 'right' });
      p.text(f.euroCompact(s.annualCost), colX(1, j), ry + 4.3, { align: 'right' });
    });
    ry += rowH;
  });
  // Total
  p.fill(C.soft);
  d.rect(x, ry, CONTENT_W, rowH + 0.6, 'F');
  p.font(8, 'bold', C.navy);
  p.text(t('results.table.total'), x + 1, ry + 4.6);
  keys.forEach((k, j) => {
    const s = result.scenarios[k].totals;
    p.font(8, 'bold', C.navy);
    p.text(f.number(s.perDay), colX(0, j), ry + 4.6, { align: 'right' });
    p.text(f.euroCompact(s.annualCost), colX(1, j), ry + 4.6, { align: 'right' });
  });
  ry += rowH + 0.6;
  p.font(6.8, 'normal', C.muted);
  p.text(`A = ${t('results.scenario.A')}  ·  B = ${t('results.scenario.B')}  ·  C = ${t('results.scenario.C')}`, x, ry + 4);
  return ry + 4;
}

function drawAssumptions(p: Pdf, t: TFunction, f: Formatters, inputs: SimulationInputs, result: SimulationResult, x: number, y: number) {
  const v = inputs.volumes;
  const rows: [string, string][] = [
    [t('results.assumptions.ordersCurrent'), f.integer(v.ordersPerDayCurrent)],
    [t('results.assumptions.ordersFuture'), f.integer(v.ordersPerDayFuture)],
    [t('results.assumptions.productsPerOrder'), f.number(v.productsPerOrder)],
    [t('results.assumptions.hours'), `${f.number(v.hoursPerDay)} h`],
    [t('results.assumptions.shifts'), f.number(v.shiftsPerDay)],
    [t('results.assumptions.days'), f.integer(v.daysPerYear)],
    [
      t('results.assumptions.mix'),
      `${f.number(v.mix.standard)} / ${f.number(v.mix.fragile)} / ${f.number(v.mix.specific)} %`,
    ],
    [t('results.assumptions.peak'), `${f.integer(result.capacity.peakThroughput)} ${t('unit.pieces')}/h`],
    [t('results.assumptions.outputs'), f.integer(inputs.flows.outputsRequired)],
    [t('results.assumptions.binsPerOrder'), f.number(inputs.flows.binsPerOrder)],
    [t('results.assumptions.cost'), f.euro(inputs.staffing.costPerOperatorYear)],
    [t('results.assumptions.horizon'), `${f.number(inputs.staffing.horizonYears)} ${t('unit.years')}`],
  ];
  const colW = (CONTENT_W - 10) / 2;
  const half = Math.ceil(rows.length / 2);
  const d = p.doc;
  rows.forEach(([k, val], i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const cx = x + col * (colW + 10);
    const cy = y + row * 5.6;
    p.font(7.8, 'normal', C.muted);
    p.text(p.fit(k, colW - 30), cx, cy);
    p.font(7.8, 'bold', C.ink);
    p.text(val, cx + colW, cy, { align: 'right' });
    p.stroke(C.line);
    d.setLineWidth(0.15);
    d.line(cx, cy + 1.8, cx + colW, cy + 1.8);
  });
  return y + half * 5.6;
}

/** Génère la synthèse et la propose au téléchargement. */
/** Charge une image (URL ou data URL) en data URL ; undefined si indisponible. */
async function toDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function downloadRoiReport(opts: Omit<ReportOptions, 'images'>): Promise<SaveOutcome> {
  const [logoWhite, machine] = await Promise.all([toDataUrl(logoWhiteUrl), toDataUrl(opts.result.machine.image)]);
  const doc = buildRoiReport({ ...opts, images: { logoWhite, machine } });
  const slug = (opts.inputs.client.company || 'client')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const filename = opts.t('pdf.filename', { company: slug || 'client', date: new Date().toISOString().slice(0, 10) });
  return saveFile(filename, doc.output('blob'), 'application/pdf');
}
