export const ORDER_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_PAID: 'order:paid',
  ORDER_VOIDED: 'order:voided',
  TABLE_STATUS_CHANGED: 'table:status_change',
} as const;

export interface PreparedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitHpp: number;
  subtotal: number;
  printTarget: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE';
  notes?: string | null;
  modifiers: any[];
}

export interface OrderPaidEvent {
  orderId: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  displayTableNumber: string;
  totalAmount: number;
  tableId?: string | null;
  items: PreparedOrderItem[];
  payments: any[];
  notes?: string | null;
}

export interface OrderVoidedEvent {
  orderId: string;
  orderNumber: string;
  orderType: string;
  displayTableNumber: string;
  reason: string;
  authorizedBy: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    printTarget: string;
  }>;
}

export interface TableStatusChangedEvent {
  tableId: string;
  tableNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
}
