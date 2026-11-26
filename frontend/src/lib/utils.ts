export function rupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Rp 0';
  }
  const num = Math.round(Number(amount));
  return `Rp ${num.toLocaleString('id-ID')}`;
}

/**
 * Memformat angka/string angka menjadi format ribuan dengan pemisah titik (.)
 * Contoh: 50000 -> "50.000", 25000 -> "25.000", 0 / "" -> ""
 */
export function formatThousands(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('id-ID');
}

/**
 * Mengubah string format ribuan bertitik kembali menjadi number murni
 * Contoh: "50.000" -> 50000, "Rp 25.000" -> 25000
 */
export function parseThousands(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const cleanStr = String(val).replace(/\D/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function cn(...classes: Array<string | boolean | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}
