import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  CommunityComment,
  CommunityPost,
  CommunityService,
  LikeSummary,
  RatingSummary
} from '../../services/community.service';

import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-discussion-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './discussion-detail.component.html',
  styleUrls: ['./discussion-detail.component.css'],
})
export class DiscussionDetailComponent implements OnInit, OnDestroy {
  private sub?: Subscription;

  loading = signal(true);
  post = signal<CommunityPost | null>(null);
  comments = signal<CommunityComment[]>([]);
  error = signal<string | null>(null);

  // new comment
  commentText = signal('');

  // ⭐ rating del post
  ratingSummary = signal<RatingSummary | null>(null);

  // 👍 likes por comentario (map por id)
  likesMap = signal<Record<string, LikeSummary>>({});

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private community: CommunityService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set('No se encontró el id del post.');
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private load(id: string) {
    this.loading.set(true);
    this.error.set(null);

    // cargamos post + comments + rating summary en paralelo (si se puede)
    forkJoin({
      post: this.community.getPostById(id).pipe(catchError(() => of(null))),
      comments: this.community.getComments(id).pipe(catchError(() => of([]))),
      rating: this.community.getPostRatingSummary(id).pipe(catchError(() => of(null))),
    }).subscribe(({ post, comments, rating }) => {
      if (!post) {
        this.post.set(null);
        this.comments.set([]);
        this.ratingSummary.set(null);
        this.likesMap.set({});
        this.error.set('No encontramos esta discusión.');
        this.loading.set(false);
        return;
      }

      this.post.set(post);
      this.comments.set(comments);
      this.ratingSummary.set(rating);

      // cargar likes para cada comentario
      const map: Record<string, LikeSummary> = {};
      this.likesMap.set(map);

      comments.forEach((c) => {
        this.community.getCommentLikes(c.id)
          .pipe(catchError(() => of({ likes: 0, likedByMe: null } as LikeSummary)))
          .subscribe((res) => {
            const current = { ...this.likesMap() };
            current[c.id] = res;
            this.likesMap.set(current);
          });
      });

      this.loading.set(false);
    });
  }

  back() {
    this.router.navigate(['/community/discussions']);
  }

  goToEvent(eventId: string) {
    this.router.navigate(['/event', eventId]);
  }

  submitComment() {
    const p = this.post();
    const text = this.commentText().trim();
    if (!p) return;

    if (text.length < 2) {
      this.error.set('Escribe un comentario un poco más largo.');
      return;
    }

    this.error.set(null);

    this.community.addComment(p.id, { content: text }).subscribe((newC) => {
      this.comments.set([...this.comments(), newC]);
      this.commentText.set('');
      this.post.set({ ...p, commentsCount: p.commentsCount + 1 });

      // cargar likes inicial para ese nuevo comentario
      const current = { ...this.likesMap() };
      current[newC.id] = { likes: 0, likedByMe: null };
      this.likesMap.set(current);
    });
  }

  // ⭐ rate del post (solo cambia tu propio rating)
  ratePost(stars: number) {
    const p = this.post();
    if (!p) return;

    this.community.ratePost(p.id, stars).subscribe(() => {
      // refrescar summary para ver promedio + myRating actualizado
      this.community.getPostRatingSummary(p.id)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => this.ratingSummary.set(res));
    });
  }

  // 👍 toggle like del comentario (solo afecta tu like)
  toggleLike(commentId: string) {
    this.community.toggleCommentLike(commentId).subscribe((res) => {
      const current = { ...this.likesMap() };
      current[commentId] = res;
      this.likesMap.set(current);
    });
  }

  likesFor(commentId: string): LikeSummary {
    return this.likesMap()[commentId] ?? { likes: 0, likedByMe: null };
  }
}