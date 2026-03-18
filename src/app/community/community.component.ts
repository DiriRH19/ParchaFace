import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NavbarComponent } from '../shared/navbar/navbar.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { CommunityPost, CommunityService } from '../services/community.service';

interface OrganizerView {
  id: string;
  name: string;
  city: string;
  bio: string;
  tags: string[];
  isFollowing: boolean;
  postsCount: number;
}

interface ActivityItem {
  id: string;
  title: string;
  city: string;
  category: string;
  replies: number;
  timeAgo: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css'],
})
export class CommunityComponent implements OnInit {
  private readonly WELCOME_KEY = 'pf_community_welcome_seen_v1';
  private readonly isBrowser: boolean;

  showWelcome = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  search = signal<string>('');
  selectedCity = signal<string>('Todas');
  selectedCategory = signal<string>('Todas');

  private recentPosts = signal<CommunityPost[]>([]);
  private trendingPosts = signal<CommunityPost[]>([]);
  private followMap = signal<Record<string, boolean>>({});

  constructor(
    private router: Router,
    private community: CommunityService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const seen = localStorage.getItem(this.WELCOME_KEY) === '1';
      this.showWelcome.set(!seen);
    } else {
      this.showWelcome.set(false);
    }
  }

  ngOnInit(): void {
    this.loadCommunityData();
  }

  dismissWelcome() {
    this.showWelcome.set(false);

    if (this.isBrowser) {
      localStorage.setItem(this.WELCOME_KEY, '1');
    }
  }

  private loadCommunityData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      recent: this.community.getPosts({
        q: '',
        city: 'Todas',
        category: 'Todas',
        sort: 'recent',
      }).pipe(catchError(() => of([]))),
      trending: this.community.getPosts({
        q: '',
        city: 'Todas',
        category: 'Todas',
        sort: 'trending',
      }).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ recent, trending }) => {
        this.recentPosts.set(recent || []);
        this.trendingPosts.set(trending || []);
        this.loading.set(false);

        if ((!recent || recent.length === 0) && (!trending || trending.length === 0)) {
          this.error.set('No encontramos actividad de comunidad en este momento.');
        }
      },
      error: () => {
        this.recentPosts.set([]);
        this.trendingPosts.set([]);
        this.loading.set(false);
        this.error.set('No se pudo cargar la comunidad.');
      },
    });
  }

  private uniquePosts = computed<CommunityPost[]>(() => {
    const merged = [...this.recentPosts(), ...this.trendingPosts()];
    const map = new Map<string, CommunityPost>();

    for (const post of merged) {
      if (post?.id) {
        map.set(post.id, post);
      }
    }

    return Array.from(map.values());
  });

  stats = computed(() => {
    const posts = this.uniquePosts();
    const totalComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
    const authors = new Set(
      posts
        .map(p => (p.authorName || '').trim())
        .filter(Boolean)
    ).size;

    const activeCities = new Set(
      posts
        .map(p => (p.city || '').trim())
        .filter(Boolean)
    ).size;

    return [
      { value: this.formatCompact(posts.length), label: 'Publicaciones' },
      { value: this.formatCompact(totalComments), label: 'Comentarios' },
      { value: this.formatCompact(authors), label: 'Autores activos' },
      { value: this.formatCompact(activeCities), label: 'Ciudades activas' },
    ];
  });

  cities = computed(() => {
    const all = this.uniquePosts()
      .map(p => (p.city || '').trim())
      .filter(Boolean);

    return ['Todas', ...Array.from(new Set(all)).sort((a, b) => a.localeCompare(b))];
  });

  categories = computed(() => {
    const all = this.uniquePosts()
      .map(p => (p.category || '').trim())
      .filter(Boolean);

    return ['Todas', ...Array.from(new Set(all)).sort((a, b) => a.localeCompare(b))];
  });

  filteredActivity = computed<ActivityItem[]>(() => {
    const q = this.search().trim().toLowerCase();
    const city = this.selectedCity();
    const cat = this.selectedCategory();

    return this.recentPosts()
      .filter((p) => {
        const byQuery =
          !q ||
          [
            p.title,
            p.content,
            p.city,
            p.category,
            p.authorName,
            p.eventTitle || '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q);

        const byCity = city === 'Todas' || p.city === city;
        const byCat = cat === 'Todas' || p.category === cat;

        return byQuery && byCity && byCat;
      })
      .map((p) => this.mapPostToActivity(p));
  });

  topActivity = computed<ActivityItem[]>(() => {
    const q = this.search().trim().toLowerCase();
    const city = this.selectedCity();
    const cat = this.selectedCategory();

    return this.trendingPosts()
      .filter((p) => {
        const byQuery =
          !q ||
          [
            p.title,
            p.content,
            p.city,
            p.category,
            p.authorName,
            p.eventTitle || '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q);

        const byCity = city === 'Todas' || p.city === city;
        const byCat = cat === 'Todas' || p.category === cat;

        return byQuery && byCity && byCat;
      })
      .map((p) => this.mapPostToActivity(p))
      .slice(0, 3);
  });

  organizers = computed<OrganizerView[]>(() => {
    const grouped = new Map<string, CommunityPost[]>();

    for (const post of this.uniquePosts()) {
      const author = (post.authorName || '').trim() || 'Usuario';
      const current = grouped.get(author) || [];
      current.push(post);
      grouped.set(author, current);
    }

    const organizers = Array.from(grouped.entries()).map(([author, posts]) => {
      const sortedPosts = [...posts].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      const latest = sortedPosts[0];
      const categories = Array.from(
        new Set(
          posts
            .map(p => (p.category || '').trim())
            .filter(Boolean)
        )
      ).slice(0, 3);

      const city = (latest?.city || '').trim() || 'Sin ciudad';
      const postsCount = posts.length;

      return {
        id: author.toLowerCase().replace(/\s+/g, '-'),
        name: author,
        city,
        bio:
          postsCount === 1
            ? `Ha participado recientemente en la comunidad desde ${city}.`
            : `Ha participado en ${postsCount} publicaciones recientes dentro de la comunidad.`,
        tags: categories,
        isFollowing: this.followMap()[author] ?? false,
        postsCount,
      };
    });

    return organizers.sort((a, b) => b.postsCount - a.postsCount);
  });

  filteredOrganizers = computed(() => {
    const q = this.search().trim().toLowerCase();
    const city = this.selectedCity();
    const cat = this.selectedCategory();

    return this.organizers().filter((o) => {
      const byQuery =
        !q ||
        [o.name, o.city, o.bio, o.tags.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q);

      const byCity = city === 'Todas' || o.city === city;
      const byCategory = cat === 'Todas' || o.tags.includes(cat);

      return byQuery && byCity && byCategory;
    });
  });

  toggleFollow(id: string) {
    const organizer = this.organizers().find((o) => o.id === id);
    if (!organizer) return;

    const key = organizer.name;
    const current = { ...this.followMap() };
    current[key] = !current[key];
    this.followMap.set(current);
  }

  goToDiscussions() {
    this.router.navigateByUrl('/community/discussions');
  }

  openDiscussion(id: string) {
    this.router.navigate(['/community/discussions', id]);
  }

  createPost() {
    this.router.navigateByUrl('/community/create-post');
  }

  viewRules() {
    console.log('View rules');
  }

  private mapPostToActivity(post: CommunityPost): ActivityItem {
    return {
      id: post.id,
      title: post.title,
      city: post.city || 'Sin ciudad',
      category: post.category || 'General',
      replies: post.commentsCount || 0,
      timeAgo: this.toTimeAgo(post.createdAt),
    };
  }

  private toTimeAgo(value: string | Date | undefined): string {
    if (!value) return 'reciente';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'reciente';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days}d`;

    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });
  }

  private formatCompact(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  }
}
