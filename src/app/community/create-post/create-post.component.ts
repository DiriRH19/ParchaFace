import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityService, CreatePostDto } from '../../services/community.service';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css'],
})
export class CreatePostComponent {
  constructor(private community: CommunityService, private router: Router) {}

  // Form state
  title = signal('');
  content = signal('');
  city = signal<string>('Todas');
  category = signal<string>('Todas');

  // Evento opcional
  attachEvent = signal(false);
  eventId = signal<string>('');

  // UI
  submitting = signal(false);
  error = signal<string | null>(null);

  cities = signal(['Todas', 'Ciudad de México', 'Guadalajara', 'Monterrey', 'Bogotá', 'Medellín']);
  categories = signal(['Todas', 'Música', 'Tech', 'Networking', 'Deportes', 'Arte', 'Gaming']);

  back() {
    this.router.navigateByUrl('/community/discussions');
  }

  submit() {
    const t = this.title().trim();
    const c = this.content().trim();

    if (t.length < 5) {
      this.error.set('El título debe tener al menos 5 caracteres.');
      return;
    }
    if (c.length < 10) {
      this.error.set('El contenido debe tener al menos 10 caracteres.');
      return;
    }

    this.error.set(null);
    this.submitting.set(true);

    const dto: CreatePostDto = {
      title: t,
      content: c,
      city: this.city() === 'Todas' ? undefined : this.city(),
      category: this.category() === 'Todas' ? undefined : this.category(),
      eventId: this.attachEvent() ? (this.eventId().trim() || null) : null,
    };

    this.community.createPost(dto).subscribe({
      next: (post) => {
        this.submitting.set(false);
        // ir al detail
        this.router.navigate(['/community/discussions', post.id]);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('No se pudo publicar. Intenta de nuevo.');
      },
    });
  }
}