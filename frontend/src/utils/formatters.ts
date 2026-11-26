export function rupiah(value: number | string | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) return 'Rp 0';
  const num = Math.round(Number(value));
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatThousands(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '' || val === 0) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('id-ID');
}

export function parseThousands(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const cleanStr = String(val).replace(/\D/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

export function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
