export interface DashboardOverview {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  totalUsers: number;
  activeUsers: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
}

export interface ChartData {
  status?: string;
  month?: string;
  count: number;
  totalViews?: number;
}

export interface TopArticle {
  id: string;
  title: string;
  views: number;
  likes: number;
  author: string;
  createdAt: string;
}

export interface RecentArticle {
  id: string;
  title: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface DashboardResponse {
  overview: DashboardOverview;
  charts: {
    articlesByStatus: ChartData[];
    articlesByMonth: ChartData[];
  };
  topArticles: TopArticle[];
  recentArticles: RecentArticle[];
}

