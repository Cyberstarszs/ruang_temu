import { EventEmitter } from 'events';

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow ample listeners without warning
    this.setMaxListeners(50);
  }
}

export const eventBus = new AppEventBus();
