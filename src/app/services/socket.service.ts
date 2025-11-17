import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../environments/environment';
import { NewNotificationEvent, NotificationCountResponse } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private socketUrl = environment.socketUrl; // WebSocket server URL
  private notificationSubject = new Subject<NewNotificationEvent>();
  private notificationCountSubject = new Subject<NotificationCountResponse>();
  private notificationReadSubject = new Subject<{ notificationId: string }>();

  /**
   * Connect to WebSocket server
   * @param token JWT token for authentication
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('✅ [AdminSocketService] Already connected');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Log the socket URL being used (for debugging)
    console.log(`🔌 [AdminSocketService] Connecting to: ${this.socketUrl}`);
    console.log(`🔑 [AdminSocketService] Token present: ${!!token}`);

    this.socket = io(this.socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 30000, // Increase timeout to 30 seconds
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      forceNew: true, // Force a new connection
      upgrade: true, // Allow transport upgrade
      rememberUpgrade: false
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Join user's personal room for notifications
   */
  joinUserRoom(): void {
    if (this.socket?.connected) {
      this.socket.emit('joinUserRoom');
    }
  }

  /**
   * Request notification count
   */
  requestNotificationCount(): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:getCount');
    }
  }

  /**
   * Mark notification as read via socket (for real-time sync)
   */
  markNotificationAsRead(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:markRead', notificationId);
    }
  }

  /**
   * Listen for new notifications
   */
  onNewNotification(): Observable<NewNotificationEvent> {
    return this.notificationSubject.asObservable();
  }

  /**
   * Listen for notification count updates
   */
  onNotificationCount(): Observable<NotificationCountResponse> {
    return this.notificationCountSubject.asObservable();
  }

  /**
   * Listen for notification read events (when notifications are marked as read)
   */
  onNotificationRead(): Observable<{ notificationId: string }> {
    return this.notificationReadSubject.asObservable();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      console.log('✅ [AdminSocketService] Connected successfully');
      this.joinUserRoom();
      
      // Request count after connection
      setTimeout(() => {
        if (this.socket?.connected) {
          this.requestNotificationCount();
        }
      }, 300);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log(`⚠️ [AdminSocketService] Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [AdminSocketService] Connection error:', error);
      console.error('❌ [AdminSocketService] Error message:', error.message);
      console.error('❌ [AdminSocketService] Error type:', error.name);
    });

    // Listen for new notifications
    this.socket.on('newNotification', (data: NewNotificationEvent) => {
      this.notificationSubject.next(data);
    });

    // Listen for notification count updates
    this.socket.on('notificationCount', (data: NotificationCountResponse) => {
      this.notificationCountSubject.next(data);
    });

    // Listen for notification read events (for real-time sync across tabs)
    this.socket.on('notification:read', (data: { notificationId: string }) => {
      this.notificationReadSubject.next(data);
    });
  }
}

