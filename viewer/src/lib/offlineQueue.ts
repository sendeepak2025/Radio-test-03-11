/**
 * Offline Queue
 * Queues failed requests for retry when connection is restored
 */

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private maxRetries = 3;
  private syncInProgress = false;
  private storageKey = 'offline-queue';

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupListeners(): void {
    window.addEventListener('online', () => {
      console.log('📡 Connection restored, syncing offline queue...');
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost, requests will be queued');
    });
  }

  /**
   * Add request to queue
   */
  async addToQueue(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any
  ): Promise<void> {
    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random()}`,
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(request);
    this.saveQueue();

    console.log(`📥 Request queued: ${method} ${url}`);

    // Try to sync if online
    if (navigator.onLine) {
      this.syncQueue();
    }
  }

  /**
   * Sync queued requests
   */
  async syncQueue(): Promise<void> {
    if (this.syncInProgress || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    const toRemove: string[] = [];

    for (const request of this.queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
          credentials: 'include'
        });

        if (response.ok) {
          console.log(`✅ Synced: ${request.method} ${request.url}`);
          toRemove.push(request.id);
        } else {
          request.retryCount++;
          
          if (request.retryCount >= this.maxRetries) {
            console.error(`❌ Max retries reached: ${request.method} ${request.url}`);
            toRemove.push(request.id);
          }
        }
      } catch (error) {
        console.error(`⚠️ Sync failed: ${request.method} ${request.url}`, error);
        request.retryCount++;
        
        if (request.retryCount >= this.maxRetries) {
          toRemove.push(request.id);
        }
      }
    }

    // Remove synced/failed requests
    this.queue = this.queue.filter(req => !toRemove.includes(req.id));
    this.saveQueue();

    this.syncInProgress = false;

    // Notify if queue is empty
    if (this.queue.length === 0) {
      console.log('✅ All queued requests synced');
      this.dispatchSyncCompleteEvent();
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; syncing: boolean } {
    return {
      pending: this.queue.length,
      syncing: this.syncInProgress
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Dispatch sync complete event
   */
  private dispatchSyncCompleteEvent(): void {
    window.dispatchEvent(new CustomEvent('offline-queue-synced'));
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
}

export default new OfflineQueue();
