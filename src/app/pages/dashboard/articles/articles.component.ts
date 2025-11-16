import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ArticleService } from '../../../services/article.service';
import { AuthService } from '../../../services/auth.service';
import { Article, ArticleFilters } from '../../../models/article.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss'
})
export class ArticlesComponent implements OnInit, OnDestroy {
  private readonly articleService = inject(ArticleService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private highlightTimeout: any = null;

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly articles = signal<Article[]>([]);
  readonly pagination = signal<any>(null);
  readonly selectedArticle = signal<Article | null>(null);
  readonly showEditModal = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);
  readonly highlightedArticleId = signal<string | null>(null);

  // Filters
  readonly filters = signal<ArticleFilters>({
    page: 1,
    limit: 10,
    status: '',
    search: ''
  });

  // Edit form
  editForm!: FormGroup;

  readonly statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' }
  ];

  readonly currentPage = computed(() => this.filters().page || 1);
  readonly totalPages = computed(() => this.pagination()?.pages || 1);

  ngOnInit(): void {
    this.isAdmin.set(this.authService.isAdmin());
    this.initEditForm();
    this.loadArticles();
    
    // Check for highlight query parameter
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['highlight']) {
        const articleId = params['highlight'];
        // Wait for articles to load, then highlight
        // Check if articles are already loaded
        if (this.articles().length > 0) {
          setTimeout(() => {
            this.highlightArticle(articleId);
            this.clearHighlightParam();
          }, 300);
        } else {
          // Wait for articles to load
          const checkInterval = setInterval(() => {
            if (this.articles().length > 0 && !this.loading()) {
              clearInterval(checkInterval);
              setTimeout(() => {
                this.highlightArticle(articleId);
                this.clearHighlightParam();
              }, 300);
            }
          }, 100);
          
          // Clear interval after 5 seconds if articles don't load
          setTimeout(() => clearInterval(checkInterval), 5000);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
  }

  highlightArticle(articleId: string): void {
    // Check if article exists in the current list
    const article = this.articles().find(a => a.id === articleId);
    if (article) {
      this.highlightedArticleId.set(articleId);
      
      // Scroll to the article
      setTimeout(() => {
        const element = document.getElementById(`article-${articleId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      // Remove highlight after 3 seconds
      this.highlightTimeout = setTimeout(() => {
        this.highlightedArticleId.set(null);
      }, 3000);
    } else {
      // Article not in current page - still set highlight in case it appears
      this.highlightedArticleId.set(articleId);
      this.highlightTimeout = setTimeout(() => {
        this.highlightedArticleId.set(null);
      }, 3000);
    }
  }

  private clearHighlightParam(): void {
    // Remove query parameter after highlighting
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { highlight: null },
      queryParamsHandling: 'merge'
    });
  }

  initEditForm(): void {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      content: ['', [Validators.required]],
      tags: ['', [Validators.required]],
      status: ['', [Validators.required]]
    });
  }

  loadArticles(): void {
    this.loading.set(true);
    this.error.set(null);

    this.articleService.getAll(this.filters()).subscribe({
      next: (response) => {
        this.articles.set(response.articles);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading articles:', err);
        this.error.set(err.error?.error || 'Failed to load articles');
        this.loading.set(false);
      }
    });
  }

  onSearchChange(search: string): void {
    this.filters.update(f => ({ ...f, search, page: 1 }));
    this.loadArticles();
  }

  onStatusChange(status: string): void {
    this.filters.update(f => ({ ...f, status: status || undefined, page: 1 }));
    this.loadArticles();
  }

  onPageChange(page: number): void {
    this.filters.update(f => ({ ...f, page }));
    this.loadArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEditModal(article: Article): void {
    this.selectedArticle.set(article);
    this.editForm.patchValue({
      title: article.title,
      content: article.content,
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      status: article.status
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedArticle.set(null);
    this.editForm.reset();
  }

  openDeleteModal(article: Article): void {
    this.selectedArticle.set(article);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedArticle.set(null);
  }

  onEditSubmit(): void {
    if (this.editForm.invalid || !this.selectedArticle()) {
      return;
    }

    const formValue = this.editForm.value;
    const updateData: any = {
      title: formValue.title,
      content: formValue.content,
      status: formValue.status
    };

    // Parse tags from comma-separated string
    if (formValue.tags) {
      updateData.tags = formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
    }

    this.loading.set(true);
    this.articleService.update(this.selectedArticle()!.id, updateData).subscribe({
      next: (response) => {
        // Update the article in the list
        this.articles.update(articles => 
          articles.map(a => a.id === response.article.id ? response.article : a)
        );
        this.closeEditModal();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error updating article:', err);
        this.error.set(err.error?.error || 'Failed to update article');
        this.loading.set(false);
      }
    });
  }

  onDelete(): void {
    if (!this.selectedArticle()) {
      return;
    }

    this.loading.set(true);
    this.articleService.delete(this.selectedArticle()!.id).subscribe({
      next: () => {
        // Remove article from list
        this.articles.update(articles => 
          articles.filter(a => a.id !== this.selectedArticle()!.id)
        );
        this.closeDeleteModal();
        this.loading.set(false);
        // Reload to update pagination
        this.loadArticles();
      },
      error: (err) => {
        console.error('Error deleting article:', err);
        this.error.set(err.error?.error || 'Failed to delete article');
        this.loading.set(false);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#3b82f6';
      case 'archived':
        return '#64748b';
      default:
        return '#94a3b8';
    }
  }

  getStatusBgColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':
        return '#d1fae5';
      case 'draft':
        return '#dbeafe';
      case 'archived':
        return '#f1f5f9';
      default:
        return '#f8fafc';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getAuthorName(article: Article): string {
    if (typeof article.author === 'object' && article.author) {
      return article.author.username || 'Unknown';
    }
    return 'Unknown';
  }

  getImageUrl(article: Article): string | null {
    if (article.imageUrl) {
      // Use article ID for cache-busting instead of Date.now() to avoid change detection errors
      // This provides stable URLs that don't change during change detection
      const cacheParam = article.id ? `?t=${article.id}` : '';
      return article.imageUrl + cacheParam;
    }
    return null;
  }
}
