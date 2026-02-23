import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  CommunityComment,
  CommunityPost,
  CommunityService,
} from '../../services/community.service';

@Component({
  selector: 'app-discussion-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  rate(commentId: string, value: number) {
    this.community.rateComment(commentId, value).subscribe((updated) => {
      if (!updated) return;
      this.comments.set(this.comments().map(c => c.id === commentId ? updated : c));
    });
  }


  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private load(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.community.getPostById(id).subscribe((p) => {
      if (!p) {
        this.post.set(null);
        this.comments.set([]);
        this.error.set('No encontramos esta discusión.');
        this.loading.set(false);
        return;
      }

      this.post.set(p);

      this.community.getComments(id).subscribe((list) => {
        this.comments.set(list);
        this.loading.set(false);
      });
    });
  }

  back() {
    this.router.navigate(['/community/discussions']);
  }

  // Si tienes ruta de evento, aquí lo ajustas (ej: /event/:id)
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
      // actualizar contador del post en pantalla
      this.post.set({ ...p, commentsCount: p.commentsCount + 1 });
    });
  }
}
