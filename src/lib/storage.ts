import { invoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function loadData(): Promise<unknown> {
  if (isTauri()) {
    const data = await invoke<unknown>('load_data');
    return data ?? null;
  }
  try {
    const raw = localStorage.getItem('snipdock');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveData(data: unknown): Promise<void> {
  if (isTauri()) {
    await invoke('save_data', { data });
  } else {
    localStorage.setItem('snipdock', JSON.stringify(data));
  }
}
