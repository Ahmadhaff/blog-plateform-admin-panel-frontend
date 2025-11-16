import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User, UserFilters, UserResponse } from '../../../models/user.model';

@Component({
  selector: 'app-editors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './editors.component.html',
  styleUrl: './editors.component.scss'
})
export class EditorsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly editors = signal<User[]>([]);
  readonly pagination = signal<any>(null);
  readonly showCreateModal = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);

  // Filters
  readonly filters = signal<UserFilters>({
    page: 1,
    limit: 10,
    role: undefined, // Not needed for editors endpoint
    isActive: undefined,
    search: ''
  });

  // Create editor form
  readonly createEditorForm: FormGroup;

  readonly currentPage = computed(() => this.filters().page || 1);
  readonly totalPages = computed(() => this.pagination()?.pages || 1);

  constructor() {
    this.createEditorForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      username: ['']
    });
  }

  ngOnInit(): void {
    // Only admins can access this page
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard/overview']);
      return;
    }
    
    this.isAdmin.set(this.authService.isAdmin());
    this.loadEditors();
  }

  loadEditors(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getAllEditors(this.filters()).subscribe({
      next: (response: UserResponse) => {
        this.editors.set(response.users);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading editors:', err);
        this.error.set(err.error?.error || 'Failed to load editors');
        this.loading.set(false);
      }
    });
  }

  onSearchChange(search: string): void {
    this.filters.update(f => ({ ...f, search, page: 1 }));
    this.loadEditors();
  }

  onStatusChange(status: string): void {
    this.filters.update(f => ({ ...f, isActive: status || undefined, page: 1 }));
    this.loadEditors();
  }

  onPageChange(page: number): void {
    this.filters.update(f => ({ ...f, page }));
    this.loadEditors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openCreateModal(): void {
    this.createEditorForm.reset();
    this.error.set(null);
    this.success.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createEditorForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  onCreateEditor(): void {
    if (this.createEditorForm.invalid) {
      this.createEditorForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.createEditorForm.value;
    const createData: { email: string; password: string; username?: string } = {
      email: formValue.email,
      password: formValue.password
    };

    if (formValue.username && formValue.username.trim()) {
      createData.username = formValue.username.trim();
    }

    this.userService.createEditor(createData).subscribe({
      next: (response) => {
        this.success.set('Editor created successfully');
        this.loading.set(false);
        
        // Reload editors list
        this.loadEditors();
        
        // Close modal after 1.5 seconds
        setTimeout(() => {
          this.closeCreateModal();
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating editor:', err);
        this.error.set(err.error?.error || 'Failed to create editor');
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
      // Use platform-server for avatars (port 3000)
      // Use user._id for cache-busting instead of Date.now() to avoid change detection errors
      return `http://localhost:3000/api/users/${user._id}/avatar?t=${user._id}`;
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

  get emailControl() {
    return this.createEditorForm.get('email');
  }

  get passwordControl() {
    return this.createEditorForm.get('password');
  }

  get usernameControl() {
    return this.createEditorForm.get('username');
  }
}

