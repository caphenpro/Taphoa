import { AppStateData } from '../types';
import { initialData } from './mockData';

const STORAGE_KEY = 'taphoa_pro_app_state_v1';

export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppState(initialData);
      return initialData;
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialData,
      ...parsed,
      settings: { ...initialData.settings, ...(parsed.settings || {}) },
      products: parsed.products || initialData.products,
      customers: parsed.customers || initialData.customers,
      orders: parsed.orders || initialData.orders,
      inventoryTransactions: parsed.inventoryTransactions || initialData.inventoryTransactions,
      debtPayments: parsed.debtPayments || initialData.debtPayments,
    };
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return initialData;
  }
}

export function saveAppState(data: AppStateData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

export function exportLocalBackupJson(data: AppStateData): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `taphoa-backup-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `HD-${dateStr}-${randomSuffix}`;
}
