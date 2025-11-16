import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, finalize, of } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  login(email: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { email, password };
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, body).pipe(
      tap(response => {
        if (response.accessToken) {
          // Store tokens in localStorage
          localStorage.setItem('adminToken', response.accessToken);
          localStorage.setItem('adminRefreshToken', response.refreshToken);
          localStorage.setItem('adminUser', JSON.stringify(response.user));
        }
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    
    // Clear local storage first (optimistic update)
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Call logout API if token exists (don't wait for response)
    if (token) {
      this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
        catchError((error) => {
          // Even if API call fails, we've already cleared local storage
          console.error('Logout API error:', error);
          return of(null);
        })
      ).subscribe();
    }
    
    // Navigate to login immediately
    this.router.navigate(['/login']);
  }

  logoutAsync(): Observable<any> {
    const token = this.getToken();
    
    // Clear local storage first (optimistic update)
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Call logout API if token exists
    if (token) {
      return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
        catchError((error) => {
          // Even if API call fails, we've already cleared local storage
          console.error('Logout API error:', error);
          return of(null);
        }),
        finalize(() => {
          // Navigate to login after logout completes (success or error)
          this.router.navigate(['/login']);
        })
      );
    }
    
    // If no token, just navigate to login and return observable
    this.router.navigate(['/login']);
    return of(null).pipe(
      tap(() => {
        // Ensure navigation happens
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('adminRefreshToken');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) {
      return null;
    }
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isEditor(): boolean {
    return this.hasRole('Éditeur');
  }

  isAdminOrEditor(): boolean {
    const user = this.getUser();
    return user?.role === 'Admin' || user?.role === 'Éditeur';
  }
}

