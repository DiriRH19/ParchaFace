import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CommunityHeroMediaService,
  CommunityHeroSlot
} from '../services/community-hero-media.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { CommunityPost, CommunityService } from '../services/community.service';

type FeedMode = 'for-you' | 'trending' | 'unanswered' | 'after-event';
type CommunityGoal = 'plan' | 'amigos' | 'recomendaciones' | 'compartir';

interface FeedTab {
  id: FeedMode;
  label: string;
  count: number;
}

interface FeedCard {
  id: string;
  title: string;
  excerpt: string;
  city: string;
  category: string;
  author: string;
  replies: number;
  timeAgo: string;
  typeLabel: string;
  eventTitle?: string | null;
}

interface ActiveMember {
  id: string;
  name: string;
  city: string;
  vibe: string;
  postsCount: number;
}

interface HeroSlotConfig {
  slot: CommunityHeroSlot;
  label: string;
  helper: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css'],
})
export class CommunityComponent implements OnInit, OnDestroy {
  private readonly WELCOME_KEY = 'pf_community_onboarding_seen_v3';
  private readonly PREF_CITY_KEY = 'pf_community_pref_city';
  private readonly PREF_CATEGORY_KEY = 'pf_community_pref_category';
  private readonly PREF_GOAL_KEY = 'pf_community_pref_goal';
  private readonly isBrowser: boolean;

  readonly canManageHeroMedia: boolean;

  private readonly curatedCities = [
    'Todas',
    'Armenia',
    'Pereira',
    'Manizales',
    'Medellín',
    'Bogotá',
    'Cali'
  ];

  private readonly curatedInterests = [
    'Todas',
    'Música',
    'Café',
    'Cine',
    'Deporte',
    'Arte',
    'Gastronomía',
    'Parche tranqui',
    'Rumba'
  ];

  readonly heroSlotOrder: CommunityHeroSlot[] = ['PARTY', 'ORGANIZE', 'CONNECT'];
  private heroRotationIntervalId: ReturnType<typeof setInterval> | null = null;

  showWelcome = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  search = signal('');
  selectedCity = signal('Armenia');
  selectedCategory = signal('Todas');
  activeFeed = signal<FeedMode>('for-you');

  onboardingCity = signal('Armenia');
  onboardingCategory = signal('Todas');
  onboardingGoal = signal<CommunityGoal>('plan');

  showHeroAdmin = signal(false);
  heroAdminMessage = signal('');
  heroUploadingSlot = signal<CommunityHeroSlot | null>(null);
  currentHeroIndex = signal(0);

  heroSlots: HeroSlotConfig[] = [
    {
      slot: 'PARTY',
      label: 'Fiesta / ambiente',
      helper: 'Imagen principal de gente disfrutando un evento o fiesta'
    },
    {
      slot: 'ORGANIZE',
      label: 'Organización',
      helper: 'Imagen relacionada con organización, planeación o promoción'
    },
    {
      slot: 'CONNECT',
      label: 'Conexión social',
      helper: 'Imagen de personas conectando, compartiendo o parchando'
    }
  ];

  heroImages = signal<Record<CommunityHeroSlot, string>>({
    PARTY: 'assets/community/community-hero-1.webp',
    ORGANIZE: 'assets/community/community-hero-2.webp',
    CONNECT: 'assets/community/community-hero-3.webp',
  });

  heroAltTexts = signal<Record<CommunityHeroSlot, string>>({
    PARTY: 'Personas disfrutando una fiesta y ambiente festivo',
    ORGANIZE: 'Organización y promoción de eventos',
    CONNECT: 'Personas conectando y compartiendo experiencias',
  });

  heroAltDrafts = signal<Record<CommunityHeroSlot, string>>({
    PARTY: 'Personas disfrutando una fiesta y ambiente festivo',
    ORGANIZE: 'Organización y promoción de eventos',
    CONNECT: 'Personas conectando y compartiendo experiencias',
  });

  heroSelectedFiles = signal<Partial<Record<CommunityHeroSlot, File | null>>>({});
  heroPreviewUrls = signal<Partial<Record<CommunityHeroSlot, string>>>({});

  private recentPosts = signal<CommunityPost[]>([]);
  private trendingPosts = signal<CommunityPost[]>([]);

  onboardingGoals = [
    { value: 'plan' as CommunityGoal, label: 'Encontrar plan' },
    { value: 'amigos' as CommunityGoal, label: 'Conocer gente' },
    { value: 'recomendaciones' as CommunityGoal, label: 'Pedir recomendaciones' },
    { value: 'compartir' as CommunityGoal, label: 'Contar experiencias' },
  ];

  currentHeroSlot = computed<CommunityHeroSlot>(() => {
    return this.heroSlotOrder[this.currentHeroIndex()] ?? 'PARTY';
  });

  constructor(
    private router: Router,
    private community: CommunityService,
    private communityHeroMediaService: CommunityHeroMediaService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.canManageHeroMedia =
      this.isBrowser &&
      !environment.production &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (this.isBrowser) {
      const seen = localStorage.getItem(this.WELCOME_KEY) === '1';
      this.showWelcome.set(!seen);

      const savedCity = localStorage.getItem(this.PREF_CITY_KEY);
      const savedCategory = localStorage.getItem(this.PREF_CATEGORY_KEY);
      const savedGoal = localStorage.getItem(this.PREF_GOAL_KEY) as CommunityGoal | null;

      if (savedCity) {
        this.selectedCity.set(savedCity);
        this.onboardingCity.set(savedCity);
      }

      if (savedCategory) {
        this.selectedCategory.set(savedCategory);
        this.onboardingCategory.set(savedCategory);
      }

      if (savedGoal && ['plan', 'amigos', 'recomendaciones', 'compartir'].includes(savedGoal)) {
        this.onboardingGoal.set(savedGoal);
      }
    }
  }

  ngOnInit(): void {
    this.loadCommunityData();
    this.loadHeroMedia();
    this.startHeroRotation();
  }

  ngOnDestroy(): void {
    this.stopHeroRotation();
  }

  @HostListener('window:keydown', ['$event'])
  handleWindowKeydown(event: KeyboardEvent): void {
    if (!this.canManageHeroMedia) return;

    const key = event.key?.toLowerCase();

    if (event.ctrlKey && event.shiftKey && key === 'h') {
      event.preventDefault();
      this.toggleHeroAdmin();
    }

    if (key === 'escape' && this.showHeroAdmin()) {
      this.showHeroAdmin.set(false);
      this.heroAdminMessage.set('');
    }
  }

  dismissWelcome(): void {
    this.showWelcome.set(false);

    if (this.isBrowser) {
      localStorage.setItem(this.WELCOME_KEY, '1');
    }
  }

  applyOnboarding(): void {
    this.selectedCity.set(this.onboardingCity());
    this.selectedCategory.set(this.onboardingCategory());
    this.activeFeed.set('for-you');
    this.showWelcome.set(false);

    if (this.isBrowser) {
      localStorage.setItem(this.WELCOME_KEY, '1');
      localStorage.setItem(this.PREF_CITY_KEY, this.onboardingCity());
      localStorage.setItem(this.PREF_CATEGORY_KEY, this.onboardingCategory());
      localStorage.setItem(this.PREF_GOAL_KEY, this.onboardingGoal());
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

  private loadHeroMedia(): void {
    this.communityHeroMediaService.listar().subscribe({
      next: (items) => {
        const images = { ...this.heroImages() };
        const alts = { ...this.heroAltTexts() };
        const drafts = { ...this.heroAltDrafts() };

        for (const item of items || []) {
          if (item?.slot && item?.imageUrl && /^https?:\/\//i.test(item.imageUrl)) {
            images[item.slot] = item.imageUrl;
            const alt = item.altText?.trim() || drafts[item.slot];
            alts[item.slot] = alt;
            drafts[item.slot] = alt;
          }
        }

        this.heroImages.set(images);
        this.heroAltTexts.set(alts);
        this.heroAltDrafts.set(drafts);
      },
      error: (err) => {
        console.error('Error cargando imágenes del hero:', err);
      }
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

  cityOptions = computed(() => {
    const dynamic = this.uniquePosts()
      .map((p) => (p.city || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...this.curatedCities, ...dynamic]));
  });

  interestOptions = computed(() => {
    const dynamic = this.uniquePosts()
      .map((p) => (p.category || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...this.curatedInterests, ...dynamic]));
  });

  searchPlaceholder = computed(() => {
    const city = this.selectedCity();
    if (city && city !== 'Todas') {
      return `Busca planes, experiencias o gente para parchar en ${city}`;
    }
    return 'Busca planes, experiencias o gente para parchar';
  });

  heroLine = computed(() => {
    const total = this.uniquePosts().length;
    const unanswered = this.uniquePosts().filter((p) => (p.commentsCount || 0) === 0).length;
    const city = this.selectedCity();

    if (city && city !== 'Todas') {
      return `${this.formatCompact(total)} conversaciones activas · ${this.formatCompact(unanswered)} esperando respuesta · foco en ${city}`;
    }

    return `${this.formatCompact(total)} conversaciones activas · ${this.formatCompact(unanswered)} esperando respuesta`;
  });

  feedTabs = computed<FeedTab[]>(() => {
    const posts = this.uniquePosts();

    return [
      { id: 'for-you', label: 'Para ti', count: this.getFeedSource('for-you', posts).length },
      { id: 'trending', label: 'Prendiendo', count: this.getFeedSource('trending', posts).length },
      { id: 'unanswered', label: 'Sin respuesta', count: this.getFeedSource('unanswered', posts).length },
      { id: 'after-event', label: 'Experiencias', count: this.getFeedSource('after-event', posts).length },
    ];
  });

  feedTitle = computed(() => {
    switch (this.activeFeed()) {
      case 'trending':
        return 'Lo que está prendiendo';
      case 'unanswered':
        return 'Temas sin respuesta';
      case 'after-event':
        return 'Experiencias y reseñas';
      default:
        return 'Conversaciones para ti';
    }
  });

  feedPosts = computed<FeedCard[]>(() => {
    const posts = this.getFeedSource(this.activeFeed(), this.uniquePosts());

    return posts
      .filter((post) => this.matchesFilters(post))
      .sort((a, b) => this.sortPosts(a, b))
      .map((post) => this.mapPostToCard(post))
      .slice(0, 10);
  });

  activeMembers = computed<ActiveMember[]>(() => {
    const grouped = new Map<string, CommunityPost[]>();

    for (const post of this.uniquePosts()) {
      const author = (post.authorName || '').trim() || 'Usuario';
      const current = grouped.get(author) || [];
      current.push(post);
      grouped.set(author, current);
    }

    return Array.from(grouped.entries())
      .map(([author, posts]) => {
        const lastPost = [...posts].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )[0];

        return {
          id: author.toLowerCase().replace(/\s+/g, '-'),
          name: author,
          city: lastPost?.city || 'Sin ciudad',
          vibe: this.getMemberVibe(posts),
          postsCount: posts.length,
        };
      })
      .sort((a, b) => b.postsCount - a.postsCount)
      .slice(0, 4);
  });

  setCity(city: string): void {
    this.selectedCity.set(city);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setFeed(feed: FeedMode): void {
    this.activeFeed.set(feed);
  }

  clearSearch(): void {
    this.search.set('');
  }

  goToDiscussions(): void {
    this.router.navigateByUrl('/community/discussions');
  }

  createPost(): void {
    this.router.navigateByUrl('/community/create-post');
  }

  openDiscussion(id: string): void {
    this.router.navigate(['/community/discussions', id]);
  }

  toggleHeroAdmin(): void {
    this.showHeroAdmin.set(!this.showHeroAdmin());
    this.heroAdminMessage.set('');
  }

  getHeroImage(slot: CommunityHeroSlot): string {
    return this.heroImages()[slot];
  }

  getHeroAlt(slot: CommunityHeroSlot): string {
    return this.heroAltTexts()[slot];
  }

  getHeroAltDraft(slot: CommunityHeroSlot): string {
    return this.heroAltDrafts()[slot] || '';
  }

  setHeroAltDraft(slot: CommunityHeroSlot, value: string): void {
    this.heroAltDrafts.set({
      ...this.heroAltDrafts(),
      [slot]: value
    });
  }

  onHeroFileSelected(slot: CommunityHeroSlot, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      this.heroAdminMessage.set('Selecciona un archivo de imagen válido.');
      return;
    }

    this.heroSelectedFiles.set({
      ...this.heroSelectedFiles(),
      [slot]: file
    });

    const reader = new FileReader();
    reader.onload = () => {
      this.heroPreviewUrls.set({
        ...this.heroPreviewUrls(),
        [slot]: String(reader.result || '')
      });
    };
    reader.readAsDataURL(file);

    this.heroAdminMessage.set('');
  }

  getHeroPreview(slot: CommunityHeroSlot): string {
    return this.heroPreviewUrls()[slot] || this.heroImages()[slot];
  }

  uploadHeroImage(slot: CommunityHeroSlot): void {
    const file = this.heroSelectedFiles()[slot];

    if (!file) {
      this.heroAdminMessage.set('Selecciona una imagen antes de subir.');
      return;
    }

    const altText = this.heroAltDrafts()[slot] || '';

    this.heroUploadingSlot.set(slot);
    this.heroAdminMessage.set('');

    this.communityHeroMediaService.subir(slot, file, altText).subscribe({
      next: (response) => {
        this.heroImages.set({
          ...this.heroImages(),
          [slot]: response.imageUrl
        });

        const finalAlt = response.altText?.trim() || altText || this.heroAltTexts()[slot];

        this.heroAltTexts.set({
          ...this.heroAltTexts(),
          [slot]: finalAlt
        });

        this.heroAltDrafts.set({
          ...this.heroAltDrafts(),
          [slot]: finalAlt
        });

        const selected = { ...this.heroSelectedFiles() };
        delete selected[slot];
        this.heroSelectedFiles.set(selected);

        const previews = { ...this.heroPreviewUrls() };
        delete previews[slot];
        this.heroPreviewUrls.set(previews);

        this.heroUploadingSlot.set(null);
        this.heroAdminMessage.set(`Imagen ${slot} actualizada correctamente.`);
      },
      error: (err) => {
        console.error(`Error subiendo imagen ${slot}:`, err);
        this.heroUploadingSlot.set(null);
        this.heroAdminMessage.set(`No se pudo subir la imagen ${slot}.`);
      }
    });
  }

  setHeroSlide(index: number): void {
    const normalized = Math.max(0, Math.min(index, this.heroSlotOrder.length - 1));
    this.currentHeroIndex.set(normalized);
    this.restartHeroRotation();
  }

  nextHeroSlide(): void {
    this.currentHeroIndex.update((current) => {
      return (current + 1) % this.heroSlotOrder.length;
    });
  }

  getHeroSlideBadge(slot: CommunityHeroSlot): string {
    switch (slot) {
      case 'PARTY':
        return 'Eventos';
      case 'ORGANIZE':
        return 'Organiza';
      case 'CONNECT':
        return 'Conecta';
    }
  }

  getHeroSlideTitle(slot: CommunityHeroSlot): string {
    switch (slot) {
      case 'PARTY':
        return 'Descubre la energía de los eventos que más te mueven';
      case 'ORGANIZE':
        return 'Promociona y organiza experiencias con más alcance';
      case 'CONNECT':
        return 'Encuentra gente con tus mismos gustos y arma parche';
    }
  }

  getHeroSlideText(slot: CommunityHeroSlot): string {
    switch (slot) {
      case 'PARTY':
        return 'Fiestas, conciertos y planes con ambiente vivo para compartir mejor cada experiencia.';
      case 'ORGANIZE':
        return 'Haz visibles tus eventos y conecta con personas interesadas en asistir y participar.';
      case 'CONNECT':
        return 'La comunidad te ayuda a conocer gente, pedir recomendaciones y compartir cómo te fue.';
    }
  }

  private startHeroRotation(): void {
    if (!this.isBrowser) return;

    this.stopHeroRotation();

    this.heroRotationIntervalId = setInterval(() => {
      this.nextHeroSlide();
    }, 4500);
  }

  private stopHeroRotation(): void {
    if (this.heroRotationIntervalId) {
      clearInterval(this.heroRotationIntervalId);
      this.heroRotationIntervalId = null;
    }
  }

  private restartHeroRotation(): void {
    if (!this.isBrowser) return;
    this.startHeroRotation();
  }

  private getFeedSource(feed: FeedMode, allPosts: CommunityPost[]): CommunityPost[] {
    switch (feed) {
      case 'trending':
        return [...allPosts].sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));

      case 'unanswered':
        return allPosts.filter((p) => (p.commentsCount || 0) === 0);

      case 'after-event':
        return allPosts.filter((p) => this.isAfterEventPost(p));

      case 'for-you':
      default:
        return [...allPosts].sort((a, b) => this.personalScore(b) - this.personalScore(a));
    }
  }

  private personalScore(post: CommunityPost): number {
    let score = 0;

    if (this.selectedCity() !== 'Todas' && post.city === this.selectedCity()) {
      score += 4;
    }

    if (this.selectedCategory() !== 'Todas' && post.category === this.selectedCategory()) {
      score += 4;
    }

    if (this.matchesGoal(post, this.onboardingGoal())) {
      score += 5;
    }

    score += Math.min(post.commentsCount || 0, 3);

    const createdAt = new Date(post.createdAt || 0).getTime();
    if (!Number.isNaN(createdAt)) {
      const ageHours = (Date.now() - createdAt) / 3600000;
      score += Math.max(0, 4 - Math.floor(ageHours / 12));
    }

    return score;
  }

  private matchesFilters(post: CommunityPost): boolean {
    const q = this.search().trim().toLowerCase();
    const city = this.selectedCity();
    const category = this.selectedCategory();

    const byQuery =
      !q ||
      [
        post.title,
        post.content,
        post.city,
        post.category,
        post.authorName,
        post.eventTitle || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);

    const byCity = city === 'Todas' || post.city === city;
    const byCategory = category === 'Todas' || post.category === category;

    return byQuery && byCity && byCategory;
  }

  private sortPosts(a: CommunityPost, b: CommunityPost): number {
    if (this.activeFeed() === 'trending') {
      return (b.commentsCount || 0) - (a.commentsCount || 0);
    }

    if (this.activeFeed() === 'for-you') {
      return this.personalScore(b) - this.personalScore(a);
    }

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }

  private mapPostToCard(post: CommunityPost): FeedCard {
    const text = (post.content || '').trim();
    const excerpt =
      text.length > 125 ? `${text.slice(0, 125).trim()}...` : text || 'Entra a la conversación y mira qué está pasando.';

    return {
      id: post.id,
      title: post.title,
      excerpt,
      city: post.city || 'Sin ciudad',
      category: post.category || 'General',
      author: post.authorName || 'Usuario',
      replies: post.commentsCount || 0,
      timeAgo: this.toTimeAgo(post.createdAt),
      typeLabel: this.detectType(post),
      eventTitle: post.eventTitle || null,
    };
  }

  private detectType(post: CommunityPost): string {
    const text = [post.title, post.content, post.eventTitle || ''].join(' ').toLowerCase();

    if (/busco|grupo|parche|quien se apunta|quién se apunta|voy solo|voy sola/.test(text)) {
      return 'Busco parche';
    }

    if (this.isAfterEventPost(post)) {
      return 'Experiencia';
    }

    if (/recomend|tips|aconsej|qué hacer|que hacer/.test(text)) {
      return 'Recomendación';
    }

    if (/\?|duda|alguien sabe|cómo|como/.test(text)) {
      return 'Pregunta';
    }

    return 'Conversación';
  }

  private isAfterEventPost(post: CommunityPost): boolean {
    const text = [post.title, post.content, post.eventTitle || ''].join(' ').toLowerCase();
    return /experiencia|reseña|review|cómo estuvo|como estuvo|después|despues|recomiendo|fotos/.test(text);
  }

  private matchesGoal(post: CommunityPost, goal: CommunityGoal): boolean {
    const text = [post.title, post.content, post.eventTitle || ''].join(' ').toLowerCase();

    switch (goal) {
      case 'amigos':
        return /grupo|parche|gente|voy solo|voy sola/.test(text);
      case 'recomendaciones':
        return /recomend|tips|aconsej|qué hacer|que hacer/.test(text);
      case 'compartir':
        return this.isAfterEventPost(post);
      case 'plan':
      default:
        return /parche|plan|grupo|recomend/.test(text);
    }
  }

  private getMemberVibe(posts: CommunityPost[]): string {
    const text = posts.map((p) => [p.title, p.content, p.category].join(' ').toLowerCase()).join(' ');

    if (/recomend|tips|aconsej/.test(text)) return 'Suele dejar buenos consejos';
    if (/grupo|parche|voy solo|voy sola/.test(text)) return 'Ayuda a conectar gente';
    if (/experiencia|reseña|review/.test(text)) return 'Comparte cómo le fue en los planes';

    return 'Se mueve bastante en la comunidad';
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
