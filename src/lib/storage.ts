/**
 * Persistance locale (pas de backend) : brouillon courant, simulations enregistrées, demandes d'étude.
 * Toutes les lectures/écritures sont protégées : l'application fonctionne même si localStorage est indisponible.
 */
import type { SimulationInputs } from '../engine/types';

const KEYS = {
  draft: 'isitec-roi:draft',
  simulations: 'isitec-roi:simulations',
  leads: 'isitec-roi:leads',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : ignoré */
  }
}

export interface SavedSimulation {
  id: string;
  name: string;
  savedAt: string;
  inputs: SimulationInputs;
}

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  /** Résumé de la simulation au moment de la demande. */
  machine: string;
  ordersPerDayFuture: number;
  annualSavings: number;
  paybackMonths: number | null;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadDraft(): SimulationInputs | null {
  return read<SimulationInputs | null>(KEYS.draft, null);
}

export function saveDraft(inputs: SimulationInputs): void {
  write(KEYS.draft, inputs);
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEYS.draft);
  } catch {
    /* stockage indisponible : ignoré */
  }
}

export function listSimulations(): SavedSimulation[] {
  return read<SavedSimulation[]>(KEYS.simulations, []);
}

export function saveSimulation(name: string, inputs: SimulationInputs): SavedSimulation {
  const sim: SavedSimulation = { id: uid(), name, savedAt: new Date().toISOString(), inputs };
  write(KEYS.simulations, [sim, ...listSimulations()]);
  return sim;
}

export function deleteSimulation(id: string): void {
  write(KEYS.simulations, listSimulations().filter((s) => s.id !== id));
}

export function listLeads(): Lead[] {
  return read<Lead[]>(KEYS.leads, []);
}

export function saveLead(lead: Omit<Lead, 'id' | 'createdAt'>): Lead {
  const full: Lead = { ...lead, id: uid(), createdAt: new Date().toISOString() };
  write(KEYS.leads, [full, ...listLeads()]);
  return full;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV au format Excel français (séparateur ";", BOM UTF-8). */
export function leadsToCsv(leads: Lead[]): string {
  const header = [
    'Date', 'Nom', 'Société', 'Email', 'Téléphone', 'Message',
    'Machine', 'Commandes/jour visées', 'Économie annuelle (€)', 'Retour (mois)',
  ];
  const rows = leads.map((l) => [
    l.createdAt, l.name, l.company, l.email, l.phone, l.message, l.machine,
    l.ordersPerDayFuture, Math.round(l.annualSavings),
    l.paybackMonths === null ? '' : l.paybackMonths.toFixed(1),
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}
