import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Notification,
  NotificationResponse,
  NotificationCountResponse
} from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  // Use platform-server API for notifications
  // Admin users are in the same database and use the same notification system
  private readonly baseUrl = `${environment.platformApiUrl}/notifications`;
  
  constructor() {
    // Log the base URL being used (for debugging)
    console.log(`📡 [NotificationService] Base URL: ${this.baseUrl}`);
  }

  /**
   * Get user notifications with pagination
   */
  getNotifications(params?: {
    page?: number;
    limit?: number;
    read?: boolean;
  }): Observable<NotificationResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.limit !== undefined) {
        httpParams = httpParams.set('limit', params.limit.toString());
      }
      if (params.read !== undefined) {
        httpParams = httpParams.set('read', params.read.toString());
      }
    }

    return this.http.get<NotificationResponse>(this.baseUrl, { params: httpParams });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<NotificationCountResponse> {
    return this.http.get<NotificationCountResponse>(`${this.baseUrl}/unread-count`);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/mark-all-read`, {});
  }
}

