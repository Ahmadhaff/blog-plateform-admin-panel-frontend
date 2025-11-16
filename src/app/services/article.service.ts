import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Article, ArticleResponse, ArticleFilters } from '../models/article.model';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAll(filters?: ArticleFilters): Observable<ArticleResponse> {
    let params = new HttpParams();
    
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.authorId) {
      params = params.set('authorId', filters.authorId);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<ArticleResponse>(`${this.baseUrl}/articles`, { params });
  }

  getById(id: string): Observable<{ article: Article }> {
    return this.http.get<{ article: Article }>(`${this.baseUrl}/articles/${id}`);
  }

  update(id: string, data: Partial<Article>): Observable<{ message: string; article: Article }> {
    return this.http.put<{ message: string; article: Article }>(`${this.baseUrl}/articles/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/articles/${id}`);
  }
}

