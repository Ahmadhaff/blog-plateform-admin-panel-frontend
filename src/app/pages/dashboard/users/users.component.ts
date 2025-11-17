import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User, UserFilters } from '../../../models/user.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly users = signal<User[]>([]);
  readonly pagination = signal<any>(null);
  readonly selectedUser = signal<User | null>(null);
  readonly showRoleModal = signal<boolean>(false);
  readonly showStatusModal = signal<boolean>(false);
  readonly currentUserId = signal<string | null>(null);
  readonly isAdmin = signal<boolean>(false);

  // Filters
  readonly filters = signal<UserFilters>({
    page: 1,
    limit: 10,
    role: '',
    isActive: undefined, // Don't filter by default - show all
    search: ''
  });

  // Role change
  selectedRole = '';

  readonly roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'Rédacteur', label: 'Rédacteur' },
    { value: 'Lecteur', label: 'Lecteur' }
  ];

  readonly statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Suspended' }
  ];

  // Admin can only change roles between 'Lecteur' and 'Rédacteur'
  readonly availableRoles = [
    { value: 'Rédacteur', label: 'Rédacteur' },
    { value: 'Lecteur', label: 'Lecteur' }
  ];

  readonly currentPage = computed(() => this.filters().page || 1);
  readonly totalPages = computed(() => this.pagination()?.pages || 1);

  ngOnInit(): void {
    const currentUser = this.authService.getUser();
    if (currentUser?._id) {
      this.currentUserId.set(currentUser._id);
    }
    this.isAdmin.set(this.authService.isAdmin());
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getAll(this.filters()).subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set(err.error?.error || 'Failed to load users');
        this.loading.set(false);
      }
    });
  }

  onSearchChange(search: string): void {
    this.filters.update(f => ({ ...f, search, page: 1 }));
    this.loadUsers();
  }

  onRoleChange(role: string): void {
    this.filters.update(f => ({ ...f, role: role || undefined, page: 1 }));
    this.loadUsers();
  }

  onStatusChange(status: string): void {
    this.filters.update(f => ({ ...f, isActive: status || undefined, page: 1 }));
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.filters.update(f => ({ ...f, page }));
    this.loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openRoleModal(user: User): void {
    // Defensive check: Éditeur and Admin users are excluded from the list by backend
    // This check is redundant but kept as defensive code
    if (user.role === 'Éditeur' || user.role === 'Admin') {
      this.error.set('Cannot change role for Éditeur or Admin users');
      return;
    }
    
    this.selectedUser.set(user);
    this.selectedRole = user.role;
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
    this.selectedUser.set(null);
    this.selectedRole = '';
  }

  openStatusModal(user: User): void {
    this.selectedUser.set(user);
    this.showStatusModal.set(true);
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
    this.selectedUser.set(null);
  }

  onUpdateRole(): void {
    const user = this.selectedUser();
    if (!user || !this.selectedRole) {
      return;
    }

    // Defensive check: Éditeur and Admin users are excluded from the list by backend
    if (user.role === 'Éditeur' || user.role === 'Admin') {
      this.error.set('Cannot change role for Éditeur or Admin users');
      this.closeRoleModal();
      return;
    }

    // Only allow Lecteur or Rédacteur roles
    if (!['Rédacteur', 'Lecteur'].includes(this.selectedRole)) {
      this.error.set('Invalid role. Only Lecteur and Rédacteur roles can be assigned.');
      return;
    }

    if (this.selectedRole === user.role) {
      this.closeRoleModal();
      return;
    }

    this.loading.set(true);
    this.error.set(null); // Clear any previous errors
    this.userService.updateRole(user._id, this.selectedRole).subscribe({
      next: (response) => {
        // Update user in the list
        this.users.update(users => 
          users.map(u => u._id === response.user._id ? { ...u, role: response.user.role } : u)
        );
        this.closeRoleModal();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error updating user role:', err);
        this.error.set(err.error?.error || 'Failed to update user role');
        this.loading.set(false);
      }
    });
  }

  onToggleStatus(): void {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    this.loading.set(true);
    this.userService.toggleActiveStatus(user._id).subscribe({
      next: (response) => {
        // Update user in the list
        this.users.update(users => 
          users.map(u => u._id === response.user._id ? { ...u, isActive: response.user.isActive } : u)
        );
        this.closeStatusModal();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error toggling user status:', err);
        this.error.set(err.error?.error || 'Failed to update user status');
        this.loading.set(false);
      }
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'Admin':
        return '#ef4444';
      case 'Éditeur':
        return '#f59e0b';
      case 'Rédacteur':
        return '#3b82f6';
      case 'Lecteur':
        return '#64748b';
      default:
        return '#94a3b8';
    }
  }

  getRoleBgColor(role: string): string {
    switch (role) {
      case 'Admin':
        return '#fee2e2';
      case 'Éditeur':
        return '#fef3c7';
      case 'Rédacteur':
        return '#dbeafe';
      case 'Lecteur':
        return '#f1f5f9';
      default:
        return '#f8fafc';
    }
  }

  getAvatarUrl(user: User): string | null {
    if (user.avatar) {
      // Use platform-server for avatars
      // Use user._id for cache-busting instead of Date.now() to avoid change detection errors
      // This provides stable URLs that don't change during change detection
      return `${environment.platformApiUrl}/users/${user._id}/avatar?t=${user._id}`;
    }
    return null;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isCurrentUser(user: User): boolean {
    return this.currentUserId() === user._id;
  }
}
