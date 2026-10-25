import { demoResponse } from './demoData';

const API_BASE = import.meta.env.VITE_API_URL || '';
// Demo catalogue fallback: on in dev by default, opt-in elsewhere with VITE_DEMO_MODE=true
const DEMO_ENABLED =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false');

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await liveRequest<T>(endpoint, options);
  } catch (err) {
    // Only fall back when the backend itself is unreachable (network error / proxy 5xx)
    if (DEMO_ENABLED && (err instanceof TypeError || (err as Error & { offline?: boolean }).offline)) {
      const mock = demoResponse(endpoint, options);
      if (mock !== undefined) return mock as T;
    }
    throw err;
  }
}

async function liveRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'BinFareedStore-Client');
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data as T;
  }

  if (!response.ok) {
    // Non-JSON 5xx usually means the dev proxy couldn't reach the backend
    throw Object.assign(new Error(`Request failed with status ${response.status}`), {
      offline: response.status >= 500,
    });
  }

  return (await response.text()) as unknown as T;
}

export function formatPrice(amount: number | undefined | null, symbol = 'Rs.'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol} 0`;
  return `${symbol} ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Islamabad Capital Territory',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
];
