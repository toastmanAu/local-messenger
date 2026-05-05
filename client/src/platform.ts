export const isiOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

export const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches
  || (navigator as any).standalone === true;

export const BASE_PATH: string = (import.meta.env.VITE_BASE_PATH || '/').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : '/' + path}`;
}
