import { STORAGE_KEY } from './constants';
import type { PersistedBoardState } from './types';

export function loadBoard(): Partial<PersistedBoardState> | null {
  const rawState = localStorage.getItem(STORAGE_KEY);
  if (!rawState) return null;
  return JSON.parse(rawState) as Partial<PersistedBoardState>;
}

export function saveBoard(state: PersistedBoardState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
