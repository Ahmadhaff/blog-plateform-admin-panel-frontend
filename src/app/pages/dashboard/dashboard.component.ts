import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { NotificationService } from '../../services/notification.service';
import { NewNotificationEvent, Notification } from '../../models/notification.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly socketService = inject(SocketService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly currentUser = signal<any>(null);
  readonly sidebarOpen = signal<boolean>(true);
  readonly notificationCount = signal<number>(0);
  readonly showNotificationDropdown = signal<boolean>(false);
  readonly notifications = signal<Notification[]>([]);
  readonly isAdmin = signal<boolean>(false);

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Check if user is Admin or Editor
    if (!this.authService.isAdminOrEditor()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get current user
    const user = this.authService.getUser();
    this.currentUser.set(user);
    this.isAdmin.set(this.authService.isAdmin());

    // Notifications are for Admin only
    if (this.isAdmin()) {
      // Connect to WebSocket and load notifications for admin
      this.connectSocket();
      this.loadNotifications();
      this.setupNotificationListeners();
    } else {
      // Ensure editors don't see or use notifications
      this.notificationCount.set(0);
      this.showNotificationDropdown.set(false);
      this.notifications.set([]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socketService.disconnect();
  }

  hasNotifications(): boolean {
    return this.notificationCount() > 0;
  }

  private connectSocket(): void {
    const token = this.authService.getToken();
    if (token) {
      this.socketService.connect(token);
      
      // Wait for socket connection before joining rooms
      setTimeout(() => {
        if (this.socketService.isConnected()) {
          this.socketService.joinUserRoom();
        }
      }, 300);
    }
  }

  private setupNotificationListeners(): void {
    // Listen for new notifications
    this.socketService.onNewNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: NewNotificationEvent) => {
        // Only show notifications for new articles (as requested)
        if (notification.type === 'new_article') {
          // Add to notifications list if dropdown is open
          const currentNotifications = this.notifications();
          const notificationExists = currentNotifications.some(n => 
            n.id === notification.id || n._id === notification.id
          );
          
          if (!notificationExists) {
            const newNotif: Notification = {
              _id: notification.id,
              id: notification.id,
              type: notification.type as any,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              read: notification.read,
              createdAt: notification.createdAt,
              articleId: notification.articleId
            };
            this.notifications.set([newNotif, ...currentNotifications]);
          }
          
          // Don't manually increment - rely on server's notificationCount event
          // which provides the actual unread count (excluding read notifications)
        }
      });

    // Listen for notification count updates from server
    // This provides the actual unread count and should be the source of truth
    this.socketService.onNotificationCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: { count: number }) => {
        this.notificationCount.set(response.count || 0);
      });

    // Listen for notification read events (for real-time sync across tabs)
    // When a notification is marked as read in another tab, update this tab too
    this.socketService.onNotificationRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: { notificationId: string }) => {
        // Update notification in list if present
        this.notifications.update(notifs =>
          notifs.map(n => n._id === data.notificationId || n.id === data.notificationId
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
          )
        );
        // Count will be updated via notificationCount event from server
      });

    // Request initial count after connection is established
    setTimeout(() => {
      if (this.socketService.isConnected()) {
        this.socketService.requestNotificationCount();
      }
    }, 500);
  }

  loadNotifications(): void {
    // Load initial unread notification count via API
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationCount.set(response.count || 0);
        },
        error: (error) => {
          console.error('❌ Error loading notification count:', error);
          this.notificationCount.set(0);
        }
      });
  }

  getAvatarUrl(): string | null {
    const user = this.currentUser();
    if (!user?._id) {
      return null;
    }

    if (user.avatar) {
      // Use platform-server for avatars (port 3000)
      // Use user._id for cache-busting instead of Date.now() to avoid change detection errors
      return `http://localhost:3000/api/users/${user._id}/avatar?t=${user._id}`;
    }
    return null;
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebarOnMobile(): void {
    // Close sidebar on mobile devices when navigation link is clicked
    if (window.innerWidth <= 1024) {
      this.sidebarOpen.set(false);
    }
  }

  toggleNotificationDropdown(): void {
    this.showNotificationDropdown.update(open => !open);
    if (this.showNotificationDropdown()) {
      // Load notifications when opening dropdown
      this.notificationService.getNotifications({ page: 1, limit: 20, read: false })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notifications.set(response.notifications || []);
          },
          error: (error) => {
            console.error('❌ Error loading notifications:', error);
            this.notifications.set([]);
          }
        });
    }
  }

  closeNotificationDropdown(): void {
    this.showNotificationDropdown.set(false);
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.markAsRead(notification._id || notification.id!);
    }

    // Navigate to articles list with article ID as query parameter
    // This will allow the articles component to highlight the specific article
    if (notification.articleId || notification.data?.articleId) {
      const articleId = notification.articleId || notification.data?.articleId;
      this.router.navigate(['/dashboard/articles'], { 
        queryParams: { highlight: articleId } 
      });
      this.closeNotificationDropdown();
    }
  }

  markAsRead(notificationId: string): void {
    // Emit socket event for real-time sync
    this.socketService.markNotificationAsRead(notificationId);

    // Call API to mark as read
    this.notificationService.markAsRead(notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update notification in list
          this.notifications.update(notifs =>
            notifs.map(n => n._id === notificationId || n.id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
            )
          );
          // Count will be updated via notificationCount event from server
        },
        error: (error) => {
          console.error('❌ Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update all notifications in list
          this.notifications.update(notifs =>
            notifs.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
          );
          // Set count to 0 (server will also emit notificationCount event for sync)
          this.notificationCount.set(0);
        },
        error: (error) => {
          console.error('❌ Error marking all notifications as read:', error);
        }
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.showNotificationDropdown() && 
        !target.closest('.notification-container') && 
        !target.closest('.notification-dropdown')) {
      this.closeNotificationDropdown();
    }
  }

  logout(): void {
    // Logout clears storage and navigates to login
    this.authService.logout();
  }
}
