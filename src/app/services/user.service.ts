import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { User, UserResponse, UserFilters } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAll(filters?: UserFilters): Observable<UserResponse> {
    let params = new HttpParams();
    
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.isActive !== undefined && filters.isActive !== '') {
      params = params.set('isActive', filters.isActive);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<UserResponse>(`${this.baseUrl}/users`, { params });
  }

  getById(id: string): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/users/${id}`);
  }

  updateRole(id: string, role: string): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.baseUrl}/users/${id}/role`, { role });
  }

  toggleActiveStatus(id: string): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.baseUrl}/users/${id}/status`, {});
  }

  createEditor(data: { email: string; password: string; username?: string }): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(`${this.baseUrl}/users/editors`, data);
  }
}

