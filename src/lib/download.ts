/**
 * Proposer un fichier généré au téléchargement.
 * - Dans le visualiseur claude.ai : capacité « downloads » (confirmation par l'utilisateur).
 * - Partout ailleurs : lien de téléchargement classique.
 */
type DownloadsApi = { save: (req: { filename: string; data: Blob | string }) => Promise<unknown> };
type ClaudeWindow = Window & { claude?: { use?: (name: string) => Promise<unknown> } };

export type SaveOutcome = 'saved' | 'declined' | 'failed';

export async function saveFile(filename: string, data: Blob | string, mime = 'application/octet-stream'): Promise<SaveOutcome> {
  const claude = (window as ClaudeWindow).claude;
  if (claude?.use) {
    try {
      const downloads = (await claude.use('downloads')) as DownloadsApi | null;
      if (downloads) {
        await downloads.save({ filename, data });
        return 'saved';
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'declined';
      if (code === 'rate_limited') return 'failed';
      // autres cas : on tente le téléchargement classique
    }
  }
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'saved';
  } catch {
    return 'failed';
  }
}
