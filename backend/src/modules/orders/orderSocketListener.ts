import { eventBus } from '../../core/eventBus';
import { ORDER_EVENTS, OrderPaidEvent, TableStatusChangedEvent } from './orderEvents';
import { emitToClients } from '../../services/websocketService';

export function initializeOrderSocketListener() {
  eventBus.on(ORDER_EVENTS.ORDER_PAID, (event: OrderPaidEvent) => {
    emitToClients('order:new', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      tableNumber: event.displayTableNumber,
      totalAmount: event.totalAmount,
    });

    if (event.tableId) {
      emitToClients('table:status_change', {
        tableId: event.tableId,
        tableNumber: event.displayTableNumber,
        status: 'OCCUPIED',
      });
    }
  });

  eventBus.on(ORDER_EVENTS.TABLE_STATUS_CHANGED, (event: TableStatusChangedEvent) => {
    emitToClients('table:status_change', event);
  });
}
