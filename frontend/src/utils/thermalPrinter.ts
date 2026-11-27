import { rupiah, formatDate, formatTime } from './formatters';
import type { Order, StoreSettings } from '../types';

function getCachedStoreSettings(): Partial<StoreSettings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('ruang_temu_store_settings_cache');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function printBrowserThermalReceipt(
  order: Order,
  options?: { paperWidth?: '58mm' | '80mm'; settings?: Partial<StoreSettings> | null }
) {
  const settings = options?.settings || getCachedStoreSettings();
  const paperWidth = options?.paperWidth || settings?.paper_size || '58mm';
  const widthPx = paperWidth === '58mm' ? '300px' : '400px';
  const storeName = settings?.store_name || 'RUANG TEMU';
  const tagline = settings?.tagline || 'Coffee, Eatery, Community';
  const address = settings?.address || 'Jl. Raya Pamekasan No. 24, Madura';
  const phone = settings?.phone || '';
  const receiptFooter = settings?.receipt_footer || 'Terima kasih atas kunjungan Anda!';
  const wifiSsid = settings?.wifi_ssid || 'Ruang Temu Cafe';
  const wifiPassword = settings?.wifi_password || '';
  const instagram = settings?.instagram || '@ruangtemu.cafe';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px;">
          <span>${item.product_name}</span>
          <span>${rupiah(item.subtotal || item.unit_price * item.quantity)}</span>
        </div>
        <div style="font-size: 10px; color: #444; padding-left: 5px;">
          ${item.quantity} x ${rupiah(item.unit_price)}
          ${item.modifiers && item.modifiers.length > 0 ? `<br /><em>(${item.modifiers.join(', ')})</em>` : ''}
          ${item.notes ? `<br /><em>Catatan: ${item.notes}</em>` : ''}
        </div>
      </div>
    `
    )
    .join('');

  const payments = order.payments && order.payments.length > 0 ? order.payments : [];
  const primaryPay = payments[0] || {
    method: 'CASH',
    amount: order.total_amount,
    cash_received: order.total_amount,
    cash_change: 0,
  };

  const paymentsHtml = payments
    .map(
      (p) => `
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
        <span>Metode: ${p.method}</span>
        <span>${rupiah(p.amount)}</span>
      </div>
      ${
        p.cash_received
          ? `
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #555;">
          <span>Tunai Diterima:</span>
          <span>${rupiah(p.cash_received)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #555;">
          <span>Kembalian:</span>
          <span>${rupiah(p.cash_change || 0)}</span>
        </div>
      `
          : ''
      }
    `
    )
    .join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${order.order_number}</title>
        <style>
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            margin: 0 auto;
            padding: 8px 10px;
            width: ${widthPx};
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 1px double #000;
            margin: 6px 0;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .subtitle {
            font-size: 10px;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${storeName}</div>
          <div class="subtitle">${tagline}</div>
          <div style="font-size: 9px; margin-bottom: 4px;">${address}</div>
          ${phone ? `<div style="font-size: 9px;">Telp: ${phone}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div style="font-size: 10px;">
          <div>No. Nota : <strong>${order.order_number}</strong></div>
          <div>Waktu    : ${formatDate(order.created_at)} ${formatTime(order.created_at)}</div>
          <div>Tipe     : <strong>${order.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}</strong> ${order.table_number ? `(${order.table_number})` : ''}</div>
          ${order.customer_name ? `<div>Pelanggan: ${order.customer_name}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="divider"></div>

        <div style="font-size: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${rupiah(order.subtotal)}</span>
          </div>
          ${
            Number(order.discount_amount || 0) > 0
              ? `
            <div style="display: flex; justify-content: space-between; color: #b00;">
              <span>Diskon Promo:</span>
              <span>-${rupiah(order.discount_amount)}</span>
            </div>
          `
              : ''
          }
          ${
            Number((order as any).service_charge_amount ?? (order as any).serviceChargeAmount ?? 0) > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #555;">
              <span>Service Charge (${Number((order as any).service_charge_rate ?? (order as any).serviceChargeRate ?? 0)}%):</span>
              <span>${rupiah(Number((order as any).service_charge_amount ?? (order as any).serviceChargeAmount ?? 0))}</span>
            </div>
          `
              : ''
          }
          ${
            Number((order as any).tax_amount ?? (order as any).taxAmount ?? 0) > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #555;">
              <span>PB1 Resto (${Number((order as any).tax_rate ?? (order as any).taxRate ?? 0)}%):</span>
              <span>${rupiah(Number((order as any).tax_amount ?? (order as any).taxAmount ?? 0))}</span>
            </div>
          `
              : ''
          }
          ${
            Number(order.claimed_down_payment || 0) > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #0369a1;">
              <span>Potongan DP:</span>
              <span>-${rupiah(Number(order.claimed_down_payment))}</span>
            </div>
          `
              : ''
          }
          ${
            Number((order as any).rounding_amount ?? (order as any).roundingAmount ?? 0) !== 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #555;">
              <span>Pembulatan:</span>
              <span>${Number((order as any).rounding_amount ?? (order as any).roundingAmount ?? 0) > 0 ? '+' : '-'}${rupiah(Math.abs(Number((order as any).rounding_amount ?? (order as any).roundingAmount ?? 0)))}</span>
            </div>
          `
              : ''
          }
        </div>

        <div class="double-divider"></div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
          <span>TOTAL:</span>
          <span>${rupiah(order.total_amount)}</span>
        </div>

        <div class="divider"></div>

        <div>
          ${paymentsHtml || `
            <div style="display: flex; justify-content: space-between; font-size: 10px;">
              <span>Bayar (${primaryPay.method}):</span>
              <span>${rupiah(order.total_amount)}</span>
            </div>
          `}
        </div>

        <div class="divider"></div>

        <div class="text-center" style="font-size: 9px; margin-top: 8px;">
          <div>${Number((order as any).tax_amount ?? (order as any).taxAmount ?? 0) > 0 || Number((order as any).service_charge_amount ?? (order as any).serviceChargeAmount ?? 0) > 0 ? `Termasuk PB1 ${Number((order as any).tax_rate ?? (order as any).taxRate ?? 0)}% & Servis ${Number((order as any).service_charge_rate ?? (order as any).serviceChargeRate ?? 0)}%` : 'Harga Nett (0% Pajak & Layanan)'}</div>
          <div style="margin-top: 4px; font-weight: bold;">${receiptFooter}</div>
          ${wifiSsid ? `<div style="margin-top: 2px;">WiFi: ${wifiSsid}${wifiPassword ? ` | Pass: ${wifiPassword}` : ''}</div>` : ''}
          ${instagram ? `<div style="margin-top: 2px; color: #666;">IG: ${instagram}</div>` : ''}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}
