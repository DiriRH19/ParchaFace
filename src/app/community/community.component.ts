import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { NavbarComponent } from '../shared/navbar/navbar.component';
import { FooterComponent } from '../shared/footer/footer.component';

type TabKey = 'organizers' | 'activity';

interface Organizer {
  id: string;
  name: string;
  city: string;
  rating: number;
  bio: string;
  tags: string[];
  isFollowing: boolean;
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
export class CommunityComponent {
  private readonly WELCOME_KEY = 'pf_community_welcome_seen_v1';
  private readonly isBrowser: boolean;

  showWelcome = signal(false);

  constructor(
    private router: Router,
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

  dismissWelcome() {
    this.showWelcome.set(false);

    if (this.isBrowser) {
      localStorage.setItem(this.WELCOME_KEY, '1');
    }
  }

  search = signal<string>('');
  activeTab = signal<TabKey>('organizers');

  selectedCity = signal<string>('Todas');
  selectedCategory = signal<string>('Todas');

  stats = signal([
    { value: '25,430', label: 'Usuarios Activos' },
    { value: '1,250', label: 'Eventos Totales' },
    { value: '340', label: 'Organizadores' },
    { value: '89', label: 'Este Mes' },
  ]);

  cities = signal(['Todas', 'Ciudad de México', 'Guadalajara', 'Monterrey', 'Bogotá', 'Medellín']);
  categories = signal(['Todas', 'Música', 'Tech', 'Networking', 'Deportes', 'Arte', 'Gaming']);

  organizers = signal<Organizer[]>([
    {
      id: 'org-1',
      name: 'EventPro',
      city: 'Ciudad de México',
      rating: 4.8,
      bio: 'Organizamos los mejores eventos de música y experiencias inmersivas.',
      tags: ['Música', 'Presencial', 'Nocturno'],
      isFollowing: false,
    },
    {
      id: 'org-2',
      name: 'GameMasters',
      city: 'Guadalajara',
      rating: 4.9,
      bio: 'La comunidad gaming más grande, torneos y meetups semanales.',
      tags: ['Gaming', 'Comunidad', 'Torneos'],
      isFollowing: true,
    },
    {
      id: 'org-3',
      name: 'TechMeetups',
      city: 'Monterrey',
      rating: 4.7,
      bio: 'Conectando desarrolladores y emprendedores con charlas prácticas.',
      tags: ['Tech', 'Networking', 'Charlas'],
      isFollowing: false,
    },
  ]);

  activity = signal<ActivityItem[]>([
    {
      id: 'act-1',
      title: '¿Recomendaciones para eventos de networking esta semana?',
      city: 'Ciudad de México',
      category: 'Networking',
      replies: 18,
      timeAgo: 'hace 2h',
    },
    {
      id: 'act-2',
      title: 'Mejor lugar para un meetup tech (proyector + sonido)',
      city: 'Monterrey',
      category: 'Tech',
      replies: 7,
      timeAgo: 'hace 6h',
    },
    {
      id: 'act-3',
      title: 'Busco gente para ir a un concierto (grupo)',
      city: 'Bogotá',
      category: 'Música',
      replies: 22,
      timeAgo: 'ayer',
    },
  ]);

  filteredOrganizers = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.organizers();

    return this.organizers().filter((o) =>
      [o.name, o.city, o.bio, o.tags.join(' ')].join(' ').toLowerCase().includes(q)
    );
  });

  filteredActivity = computed(() => {
    const q = this.search().trim().toLowerCase();
    const city = this.selectedCity();
    const cat = this.selectedCategory();

    return this.activity().filter((a) => {
      const byQuery = !q || [a.title, a.city, a.category].join(' ').toLowerCase().includes(q);
      const byCity = city === 'Todas' || a.city === city;
      const byCat = cat === 'Todas' || a.category === cat;
      return byQuery && byCity && byCat;
    });
  });

  topActivity = computed(() => this.filteredActivity().slice(0, 3));

  setTab(tab: TabKey) {
    this.activeTab.set(tab);
  }

  toggleFollow(id: string) {
    this.organizers.update((list) =>
      list.map((o) => (o.id === id ? { ...o, isFollowing: !o.isFollowing } : o))
    );
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
}