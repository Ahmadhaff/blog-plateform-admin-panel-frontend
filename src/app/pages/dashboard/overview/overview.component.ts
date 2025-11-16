import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AnalyticsService } from '../../../services/analytics.service';
import { DashboardResponse, DashboardOverview } from '../../../models/analytics.model';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly overview = signal<DashboardOverview | null>(null);
  readonly articlesByStatus = signal<any[]>([]);
  readonly articlesByMonth = signal<any[]>([]);
  readonly topArticles = signal<any[]>([]);
  readonly recentArticles = signal<any[]>([]);

  readonly statusChartData = computed(() => {
    const data = this.articlesByStatus();
    return {
      labels: data.map(item => item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || ''),
      values: data.map(item => item.count || 0),
      colors: data.map(item => this.getStatusColor(item.status || ''))
    };
  });

  readonly monthChartData = computed(() => {
    const data = this.articlesByMonth();
    return {
      labels: data.map(item => item.month || ''),
      values: data.map(item => item.count || 0),
      maxValue: Math.max(...data.map(item => item.count || 0), 1)
    };
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getDashboard().subscribe({
      next: (response: DashboardResponse) => {
        this.overview.set(response.overview);
        this.articlesByStatus.set(response.charts.articlesByStatus);
        this.articlesByMonth.set(response.charts.articlesByMonth);
        this.topArticles.set(response.topArticles);
        this.recentArticles.set(response.recentArticles);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.error.set(err.error?.error || 'Failed to load dashboard data');
        this.loading.set(false);
      }
    });
  }

  getPieChartOffset(index: number): string {
    const statusData = this.statusChartData();
    const overview = this.overview();
    
    if (!overview || statusData.values.length === 0 || overview.totalArticles === 0) {
      return '0';
    }

    if (index === 0) {
      return '0';
    }

    const previousSum = statusData.values.slice(0, index).reduce((sum, val) => sum + val, 0);
    const offset = (previousSum / overview.totalArticles) * 502.65;
    return `-${offset}`;
  }

  getPieChartDashArray(index: number): string {
    const statusData = this.statusChartData();
    const overview = this.overview();
    
    if (!overview || statusData.values.length === 0 || overview.totalArticles === 0) {
      return '0 502.65';
    }

    const value = statusData.values[index] || 0;
    const dashLength = (value / overview.totalArticles) * 502.65;
    return `${dashLength} 502.65`;
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

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

