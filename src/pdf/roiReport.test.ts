import { describe, expect, it } from 'vitest';
import { createDefaultInputs } from '../config/defaults';
import { findMachine } from '../config/machines';
import { runSimulation } from '../engine';
import { translate } from '../i18n';
import { createFormatters } from '../lib/format';
import { buildRoiReport, pdfText } from './roiReport';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('fr', key, params);
const f = createFormatters('fr-FR');

describe('synthèse PDF', () => {
  it('remplace les espaces insécables non gérées par les polices PDF', () => {
    expect(pdfText(f.euro(1234567))).not.toMatch(/\u202f/);
  });

  it('génère un PDF A4 de 2 pages, y compris pour un cas non rentable', async () => {
    for (const future of [4000, 0]) {
      const inputs = createDefaultInputs();
      inputs.volumes.ordersPerDayFuture = future;
      inputs.client = { company: 'Société Test', contactName: 'Camille Martin', role: 'Directrice logistique', email: 'c@test.fr', phone: '', sector: 'retail' };
      const result = runSimulation(inputs, findMachine(inputs.machineId));
      const fs = await import('node:fs');
      const dataUrl = (path: string, mime: string) => `data:${mime};base64,${fs.readFileSync(path).toString('base64')}`;
      const images = {
        logoWhite: dataUrl('src/assets/logo-isitec-white.png', 'image/png'),
        machine: dataUrl('src/assets/products/isiwall-3d.jpg', 'image/jpeg'),
      };
      const doc = buildRoiReport({ inputs, result, t, f, date: new Date('2026-10-08'), images });
      expect(doc.getNumberOfPages()).toBe(2);
      const bytes = doc.output('arraybuffer');
      expect(bytes.byteLength).toBeGreaterThan(5000);
      if (process.env.PDF_OUT && future > 0) {
        // Aperçu manuel : PDF_OUT=/chemin/rapport.pdf npm test
        fs.writeFileSync(process.env.PDF_OUT, Buffer.from(bytes));
      }
    }
  });
});

describe('catalogue', () => {
  it('chaque machine du catalogue génère une simulation et un PDF', async () => {
    const { MACHINES } = await import('../config/machines');
    for (const m of MACHINES) {
      const inputs = createDefaultInputs();
      inputs.machineId = m.id;
      const result = runSimulation(inputs, m);
      expect(Number.isFinite(result.roi.annualSavings)).toBe(true);
      expect(buildRoiReport({ inputs, result, t, f }).getNumberOfPages()).toBe(2);
    }
  });
});
