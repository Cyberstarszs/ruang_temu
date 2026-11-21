import { eventBus } from '../../core/eventBus';
import { ORDER_EVENTS, OrderPaidEvent, OrderVoidedEvent } from '../orders/orderEvents';
import { queueAndSendPrintJob } from '../../services/printService';

export function initializePrintListener() {
  const barIp = process.env.PRINTER_BAR_IP || '192.168.1.200';
  const barPort = parseInt(process.env.PRINTER_BAR_PORT || '9100', 10);
  const kitIp = process.env.PRINTER_KITCHEN_IP || '192.168.1.201';
  const kitPort = parseInt(process.env.PRINTER_KITCHEN_PORT || '9100', 10);

  // 1. ORDER PAID -> PRINT PRODUCTION CHECKERS
  eventBus.on(ORDER_EVENTS.ORDER_PAID, async (event: OrderPaidEvent) => {
    try {
      const barItems = event.items
        .filter((i) => i.printTarget === 'BAR_PRINTER')
        .map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          notes: i.notes || undefined,
          modifiers: i.modifiers?.map((m: any) => m.name || m),
        }));

      const kitchenItems = event.items
        .filter((i) => i.printTarget === 'KITCHEN_PRINTER')
        .map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          notes: i.notes || undefined,
          modifiers: i.modifiers?.map((m: any) => m.name || m),
        }));

      if (barItems.length > 0) {
        queueAndSendPrintJob(event.orderId, 'CHECKER_BAR', barIp, barPort, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          tableNumber: event.displayTableNumber,
          orderType: event.orderType === 'DINE_IN' ? 'DINE-IN' : 'TAKEAWAY',
          items: barItems,
          docType: 'CHECKER_BAR',
          specialNotes: event.notes || undefined,
        }).catch((err) => console.error('[Print Listener Bar Error]', err.message));
      }

      if (kitchenItems.length > 0) {
        queueAndSendPrintJob(event.orderId, 'CHECKER_KITCHEN', kitIp, kitPort, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          tableNumber: event.displayTableNumber,
          orderType: event.orderType === 'DINE_IN' ? 'DINE-IN' : 'TAKEAWAY',
          items: kitchenItems,
          docType: 'CHECKER_KITCHEN',
          specialNotes: event.notes || undefined,
        }).catch((err) => console.error('[Print Listener Kitchen Error]', err.message));
      }
    } catch (err: any) {
      console.error('[Print Listener Error]', err.message);
    }
  });

  // 2. ORDER VOIDED -> PRINT CANCEL TICKET
  eventBus.on(ORDER_EVENTS.ORDER_VOIDED, async (event: OrderVoidedEvent) => {
    try {
      const barItems = event.items
        .filter((i) => i.printTarget === 'BAR_PRINTER')
        .map((i) => ({ name: i.name, quantity: i.quantity }));

      const kitchenItems = event.items
        .filter((i) => i.printTarget === 'KITCHEN_PRINTER')
        .map((i) => ({ name: i.name, quantity: i.quantity }));

      if (barItems.length > 0) {
        queueAndSendPrintJob(event.orderId, 'VOID_BAR', barIp, barPort, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          tableNumber: event.displayTableNumber,
          orderType: event.orderType,
          items: barItems,
          docType: 'VOID_BAR',
          specialNotes: `BATAL: ${event.reason}`,
        }).catch((err) => console.error('[Print Void Bar Error]', err.message));
      }

      if (kitchenItems.length > 0) {
        queueAndSendPrintJob(event.orderId, 'VOID_KITCHEN', kitIp, kitPort, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          tableNumber: event.displayTableNumber,
          orderType: event.orderType,
          items: kitchenItems,
          docType: 'VOID_KITCHEN',
          specialNotes: `BATAL: ${event.reason}`,
        }).catch((err) => console.error('[Print Void Kitchen Error]', err.message));
      }
    } catch (err: any) {
      console.error('[Print Void Listener Error]', err.message);
    }
  });
}
