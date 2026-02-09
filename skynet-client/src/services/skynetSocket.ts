import { SkyNetAcarsSnapshot, WebSocketMessage, ConnectionStatus } from '../types/acars';

type MessageHandler = (data: SkyNetAcarsSnapshot) => void;
type StatusHandler = (status: ConnectionStatus) => void;

/**
 * SkyNet WebSocket Service
 * Handles connection to SkyNet backend WebSocket server
 */
export class SkyNetSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 3000; // 3 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private shouldReconnect: boolean = true;

  constructor(url: string = 'ws://localhost:3000/ws/skynet:flights') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[SkyNet] WebSocket connected');
        this.updateStatus('connected');
        this.clearReconnectTimer();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[SkyNet] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[SkyNet] WebSocket error:', error);
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        console.log('[SkyNet] WebSocket disconnected');
        this.updateStatus('disconnected');
        this.ws = null;

        // Auto-reconnect if enabled
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[SkyNet] Failed to create WebSocket:', error);
      this.updateStatus('error');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      console.log('[SkyNet] Attempting to reconnect...');
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'position_update' && message.data) {
      this.notifyMessageHandlers(message.data);
    } else if (message.type === 'connected') {
      console.log('[SkyNet]', message.message || 'Connected');
    } else if (message.type === 'error') {
      console.error('[SkyNet]', message.error || 'Unknown error');
    }
  }

  /**
   * Update connection status and notify handlers
   */
  private updateStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.notifyStatusHandlers(status);
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Register status change handler
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Immediately call with current status
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Notify all message handlers
   */
  private notifyMessageHandlers(data: SkyNetAcarsSnapshot): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('[SkyNet] Error in message handler:', error);
      }
    });
  }

  /**
   * Notify all status handlers
   */
  private notifyStatusHandlers(status: ConnectionStatus): void {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        console.error('[SkyNet] Error in status handler:', error);
      }
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const skynetSocket = new SkyNetSocket();
