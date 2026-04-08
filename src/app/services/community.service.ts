import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export type SortKey = 'recent' | 'trending' | 'unanswered';

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  city?: string;
  category?: string;
  eventId?: string | null;
  eventTitle?: string | null;
  eventImage?: string | null;
  authorName: string;
  createdAt: string;
  commentsCount: number;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  createdAt: string;
  rating?: number;
}

export interface PostsQuery {
  q?: string;
  city?: string;
  category?: string;
  sort?: SortKey;
}

export interface CreatePostDto {
  title: string;
  content: string;
  city?: string;
  category?: string;
  eventId?: string | null;
}

export interface CreateCommentDto {
  content: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
  myRating: number | null;
}

export interface LikeSummary {
  likes: number;
  likedByMe: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private baseUrl = API_CONFIG.baseUrl || '';
  private communityBase = `${this.baseUrl}/community`;

  constructor(private http: HttpClient) {}

  private mapPostFromApi(p: any): CommunityPost {
    return {
      id: String(p.idPost ?? p.id ?? ''),
      title: p.title ?? '',
      content: p.content ?? '',
      city: p.city ?? undefined,
      category: p.category ?? undefined,
      eventId: p.eventId != null ? String(p.eventId) : null,
      eventTitle: null,
      eventImage: null,
      authorName:
        p.authorName ??
        p.authorCorreo ??
        p.usuario?.nombre ??
        p.usuarioNombre ??
        'Usuario',
      createdAt: p.createdAt ?? new Date().toISOString(),
      commentsCount: Number(p.commentsCount ?? 0),
    };
  }

  private mapCommentFromApi(c: any): CommunityComment {
    return {
      id: String(c.idComment ?? c.id ?? ''),
      postId: String(c.postId ?? ''),
      content: c.content ?? '',
      authorName:
        c.authorName ??
        c.authorCorreo ??
        c.usuario?.nombre ??
        c.usuarioNombre ??
        'Usuario',
      createdAt: c.createdAt ?? new Date().toISOString(),
      rating: c.rating ?? undefined,
    };
  }

  private toNumberId(id: string): number {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  }

  getPosts(query: PostsQuery): Observable<CommunityPost[]> {
    let params = new HttpParams();

    if (query.q) params = params.set('q', query.q);
    if (query.city) params = params.set('city', query.city);
    if (query.category) params = params.set('category', query.category);
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<any[]>(`${this.communityBase}/posts`, { params }).pipe(
      map(list => (list ?? []).map(p => this.mapPostFromApi(p))),
      catchError((err) => {
        console.error('getPosts error', err);
        return of([]);
      })
    );
  }

  getPostById(id: string): Observable<CommunityPost | null> {
    const postId = this.toNumberId(id);

    return this.http.get<any>(`${this.communityBase}/posts/${postId}`).pipe(
      map(p => this.mapPostFromApi(p)),
      catchError((err) => {
        console.error('getPostById error', err);
        return of(null);
      })
    );
  }

  getComments(postIdStr: string): Observable<CommunityComment[]> {
    const postId = this.toNumberId(postIdStr);

    return this.http.get<any[]>(`${this.communityBase}/posts/${postId}/comments`).pipe(
      map(list => (list ?? []).map(c => this.mapCommentFromApi(c))),
      catchError((err) => {
        console.error('getComments error', err);
        return of([]);
      })
    );
  }

  createPost(dto: CreatePostDto): Observable<CommunityPost> {
    const payload = {
      title: dto.title,
      content: dto.content,
      city: dto.city ?? null,
      category: dto.category ?? null,
      eventId: dto.eventId ? this.toNumberId(dto.eventId) : null,
    };

    return this.http.post<any>(`${this.communityBase}/posts`, payload).pipe(
      map(p => this.mapPostFromApi(p))
    );
  }

  addComment(postIdStr: string, dto: CreateCommentDto): Observable<CommunityComment> {
    const postId = this.toNumberId(postIdStr);

    return this.http.post<any>(`${this.communityBase}/posts/${postId}/comments`, dto).pipe(
      map(c => this.mapCommentFromApi(c))
    );
  }

  rateComment(commentIdStr: string, rating: number): Observable<CommunityComment | null> {
    const commentId = this.toNumberId(commentIdStr);

    return this.http.post<any>(`${this.communityBase}/comments/${commentId}/rating`, { rating }).pipe(
      map(c => this.mapCommentFromApi(c)),
      catchError((err) => {
        console.error('rateComment error', err);
        return of(null);
      })
    );
  }

  getPostRatingSummary(postId: string): Observable<RatingSummary> {
    const id = this.toNumberId(postId);
    return this.http.get<RatingSummary>(`${this.communityBase}/posts/${id}/rating`);
  }

  ratePost(postId: string): Observable<any>;
  ratePost(postId: string, rating: number): Observable<any>;
  ratePost(postId: string, rating?: number): Observable<any> {
    const id = this.toNumberId(postId);
    return this.http.post(`${this.communityBase}/posts/${id}/rating`, { rating });
  }

  getCommentLikes(commentId: string): Observable<LikeSummary> {
    const id = this.toNumberId(commentId);
    return this.http.get<LikeSummary>(`${this.communityBase}/comments/${id}/likes`);
  }

  toggleCommentLike(commentId: string): Observable<LikeSummary> {
    const id = this.toNumberId(commentId);
    return this.http.post<LikeSummary>(`${this.communityBase}/comments/${id}/like`, {});
  }
}