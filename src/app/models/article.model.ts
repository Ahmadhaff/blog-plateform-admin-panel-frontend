export interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  views: number;
  likesCount: number;
  commentCount?: number;
  author: {
    _id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
  image?: {
    fileId: string;
    filename: string;
    mimetype: string;
    size: number;
  };
  imageUrl?: string;
}

export interface ArticleResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ArticleFilters {
  status?: string;
  authorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

