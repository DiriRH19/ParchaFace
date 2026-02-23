import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type SortKey = 'recent' | 'trending' | 'unanswered';

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  city?: string;
  category?: string;
  eventId?: string | null;
  eventTitle?: string | null;
  eventImage?: string | null; // ruta relativa o URL
  authorName: string;
  createdAt: string; // ISO o string friendly
  commentsCount: number;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  createdAt: string;

  // ⭐ rating opcional (1..5)
  rating?: number;
}

export interface PostsQuery {
  q?: string;
  city?: string;       // "Todas" -> undefined
  category?: string;   // "Todas" -> undefined
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

@Injectable({ providedIn: 'root' })
export class CommunityService {
  // ✅ Mock data (MVP)
  private posts: CommunityPost[] = [
    {
      id: 'p1',
      title: '¿Recomendaciones para networking esta semana?',
      content: 'Busco eventos con buen ambiente para conectar, ¿alguno recomendado?',
      city: 'Ciudad de México',
      category: 'Networking',
      eventId: 'e101',
      eventTitle: 'After Office Networking CDMX',
      eventImage: '/uploads/eventos/sample1.jpg',
      authorName: 'Laura',
      createdAt: '2026-02-19T18:30:00Z',
      commentsCount: 18,
    },
    {
      id: 'p2',
      title: 'Mejor lugar para meetup tech (proyector + sonido)',
      content: '¿Alguna sede buena en MTY con proyector y sonido decente?',
      city: 'Monterrey',
      category: 'Tech',
      eventId: null,
      eventTitle: null,
      eventImage: null,
      authorName: 'Diego',
      createdAt: '2026-02-20T02:10:00Z',
      commentsCount: 7,
    },
    {
      id: 'p3',
      title: 'Voy al concierto del sábado, ¿alguien se anima?',
      content: 'Armo grupo para ir juntos. DM por comentarios.',
      city: 'Bogotá',
      category: 'Música',
      eventId: 'e202',
      eventTitle: 'Concierto en Vivo - Sábado',
      eventImage: '/uploads/eventos/sample2.jpg',
      authorName: 'Sofi',
      createdAt: '2026-02-18T20:00:00Z',
      commentsCount: 22,
    },
  ];

  private comments: CommunityComment[] = [
    {
      id: 'c1',
      postId: 'p1',
      content: 'Te recomiendo el After Office del jueves.',
      authorName: 'Andrés',
      createdAt: '2026-02-19T19:00:00Z',
      rating: 4,
    },
    {
      id: 'c2',
      postId: 'p1',
      content: 'Hay uno buenísimo en Roma Norte.',
      authorName: 'Mariana',
      createdAt: '2026-02-19T20:15:00Z',
      rating: 5,
    },
    {
      id: 'c3',
      postId: 'p2',
      content: 'Checa el coworking X, rentan sala.',
      authorName: 'Pablo',
      createdAt: '2026-02-20T03:00:00Z',
      rating: 3,
    },
  ];

  getPosts(query: PostsQuery): Observable<CommunityPost[]> {
    const q = (query.q ?? '').trim().toLowerCase();
    const city = query.city && query.city !== 'Todas' ? query.city : undefined;
    const cat = query.category && query.category !== 'Todas' ? query.category : undefined;
    const sort = query.sort ?? 'recent';

    let list = [...this.posts];

    if (q) {
      list = list.filter((p) =>
        [p.title, p.content, p.city, p.category, p.eventTitle, p.authorName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (city) list = list.filter((p) => p.city === city);
    if (cat) list = list.filter((p) => p.category === cat);

    // sort mock
    if (sort === 'recent') {
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } else if (sort === 'unanswered') {
      list.sort((a, b) => a.commentsCount - b.commentsCount);
    } else if (sort === 'trending') {
      list.sort((a, b) => b.commentsCount - a.commentsCount);
    }

    return of(list);
  }

  getPostById(id: string): Observable<CommunityPost | null> {
    return of(this.posts.find((p) => p.id === id) ?? null);
  }

  getComments(postId: string): Observable<CommunityComment[]> {
    const list = this.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return of(list);
  }


  createPost(dto: CreatePostDto): Observable<CommunityPost> {
    const newPost: CommunityPost = {
      id: 'p' + Math.random().toString(16).slice(2),
      title: dto.title,
      content: dto.content,
      city: dto.city,
      category: dto.category,
      eventId: dto.eventId ?? null,
      eventTitle: null,
      eventImage: null,
      authorName: 'Tú',
      createdAt: new Date().toISOString(),
      commentsCount: 0,
    };

    this.posts = [newPost, ...this.posts];
    return of(newPost);
  }

  addComment(postId: string, dto: CreateCommentDto): Observable<CommunityComment> {
    const newComment: CommunityComment = {
      id: 'c' + Math.random().toString(16).slice(2),
      postId,
      content: dto.content,
      authorName: 'Tú',
      createdAt: new Date().toISOString(),
      rating: undefined,
    };

    this.comments = [...this.comments, newComment];

    // update count
    this.posts = this.posts.map((p) =>
      p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
    );

    return of(newComment);
  }

  // ⭐ PUNTUAR COMENTARIO (1..5)
  rateComment(commentId: string, rating: number): Observable<CommunityComment | null> {
    const safe = Math.max(1, Math.min(5, Math.round(rating)));

    let updated: CommunityComment | null = null;
    this.comments = this.comments.map((c) => {
      if (c.id !== commentId) return c;
      updated = { ...c, rating: safe };
      return updated!;
    });

    return of(updated);
  }

  // (Opcional) Promedio rating por post (para mostrar luego en Discussions)
  getAverageRatingForPost(postId: string): Observable<number | null> {
    const list = this.comments.filter((c) => c.postId === postId && typeof c.rating === 'number');
    if (list.length === 0) return of(null);
    const avg = list.reduce((sum, c) => sum + (c.rating ?? 0), 0) / list.length;
    return of(Math.round(avg * 10) / 10); // 1 decimal
  }
}
