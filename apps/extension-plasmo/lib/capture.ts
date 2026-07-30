/**
 * Thin capture helpers for the Plasmo spike.
 * Production capture remains in apps/extension (CaptureService + IndexedDB).
 * This spike proves packaging; capture here is intentionally localStorage-backed
 * so Plasmo build does not need to bundle the MV3 service worker stack.
 */

export type SpikeCapture = {
  id: string;
  title: string;
  url: string;
  capturedAt: string;
};

const STORAGE_KEY = "tabby.plasmo.spike.captures";

export function listSpikeCaptures(): SpikeCapture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SpikeCapture[]) : [];
  } catch {
    return [];
  }
}

export function saveSpikeCapture(input: {
  title: string;
  url: string;
}): SpikeCapture {
  const next: SpikeCapture = {
    id: crypto.randomUUID(),
    title: input.title || "Untitled",
    url: input.url,
    capturedAt: new Date().toISOString(),
  };
  const all = [next, ...listSpikeCaptures()].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return next;
}
