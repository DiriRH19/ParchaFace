import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { WeatherService, ClimaResponse } from '../services/weather.service';

export interface Event {
  id?: number;
  title: string;
  description: string;
  date: string;
  location: string;
  ciudad?: string;
  attendees: string;
  category: string;
  tags: string[];
  price: string;
  rating: number;

  // Compatibilidad con versión anterior
  imageUrl?: string;

  // Nuevas variantes para múltiples imágenes
  imageUrls?: string[];
  images?: string[];
  galleryImages?: string[];

  // Redes sociales opcionales
  socialLinks?: Record<string, string | null | undefined> | null;
  redesSociales?: Record<string, string | null | undefined> | null;
  socialMedia?: Record<string, string | null | undefined> | null;

  facebookUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  xUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;

  registeredCount?: number | null;
  capacity?: number | null;
}

interface SocialEntry {
  key: string;
  label: string;
  icon: string;
  url: string;
}

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.css']
})
export class EventCardComponent implements OnChanges, OnDestroy {
  @Input() event: Event = {
    id: undefined,
    title: 'Evento',
    description: '',
    date: '',
    location: '',
    ciudad: '',
    attendees: '',
    category: '',
    tags: [],
    price: 'Gratis',
    rating: 0,
    imageUrl: '',
    imageUrls: [],
    images: [],
    galleryImages: [],
    socialLinks: null,
    redesSociales: null,
    socialMedia: null,
    registeredCount: null,
    capacity: null
  };

  clima: ClimaResponse | null = null;
  climaLoading = false;
  climaError = false;

  eventImages: string[] = [];
  currentImageIndex = 0;
  socialEntries: SocialEntry[] = [];

  private climaSubscription: Subscription | null = null;
  private imageRotationTimer: ReturnType<typeof setInterval> | null = null;
  private readonly imageRotationMs = 4000;

  constructor(private weatherService: WeatherService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event']) {
      this.syncEventImages();
      this.syncSocialLinks();
      this.loadClima();
    }
  }

  ngOnDestroy(): void {
    this.stopImageRotation();
    this.climaSubscription?.unsubscribe();
  }

  get displayedImage(): string | null {
    return this.eventImages[this.currentImageIndex] ?? null;
  }

  get hasMultipleImages(): boolean {
    return this.eventImages.length > 1;
  }

  get hasCapacityInfo(): boolean {
    return this.event?.registeredCount != null || this.event?.capacity != null;
  }

  get capacityText(): string {
    const inscritos = this.toSafeNumber(this.event?.registeredCount);
    const cupo = this.toSafeNumber(this.event?.capacity);

    if (inscritos === null && cupo === null) return '';

    return `${inscritos ?? '—'} / ${cupo ?? '—'}`;
  }

  goToImage(index: number): void {
    if (index < 0 || index >= this.eventImages.length) return;
    this.currentImageIndex = index;
    this.restartImageRotation();
  }

  onImgError(): void {
    if (!this.eventImages.length) return;

    this.eventImages = this.eventImages.filter(
      (_, index) => index !== this.currentImageIndex
    );

    if (!this.eventImages.length) {
      this.currentImageIndex = 0;
      this.stopImageRotation();
      return;
    }

    if (this.currentImageIndex >= this.eventImages.length) {
      this.currentImageIndex = 0;
    }

    this.restartImageRotation();
  }

  private syncEventImages(): void {
    const candidates: string[] = [
      ...(this.event.imageUrls ?? []),
      ...(this.event.images ?? []),
      ...(this.event.galleryImages ?? []),
      this.event.imageUrl ?? ''
    ];

    this.eventImages = Array.from(
      new Set(
        candidates
          .map((img) => (typeof img === 'string' ? img.trim() : ''))
          .filter(Boolean)
      )
    );

    this.currentImageIndex = 0;
    this.restartImageRotation();
  }

  private restartImageRotation(): void {
    this.stopImageRotation();

    if (this.eventImages.length <= 1) return;

    this.imageRotationTimer = setInterval(() => {
      if (!this.eventImages.length) return;
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.eventImages.length;
    }, this.imageRotationMs);
  }

  private stopImageRotation(): void {
    if (this.imageRotationTimer) {
      clearInterval(this.imageRotationTimer);
      this.imageRotationTimer = null;
    }
  }

  private syncSocialLinks(): void {
    const socialMap = new Map<string, string>();

    const nestedSources = [
      this.event.socialLinks,
      this.event.redesSociales,
      this.event.socialMedia
    ];

    for (const source of nestedSources) {
      if (!source || typeof source !== 'object') continue;

      for (const [rawKey, rawValue] of Object.entries(source)) {
        const key = this.normalizeSocialKey(rawKey);
        const url = this.normalizeSocialUrl(key, rawValue);
        if (key && url && !socialMap.has(key)) {
          socialMap.set(key, url);
        }
      }
    }

    const flatSources: Record<string, unknown> = {
      facebook: this.event.facebookUrl ?? (this.event as any).facebook,
      instagram: this.event.instagramUrl ?? (this.event as any).instagram,
      whatsapp: this.event.whatsappUrl ?? (this.event as any).whatsapp,
      x:
        this.event.xUrl ??
        this.event.twitterUrl ??
        (this.event as any).x ??
        (this.event as any).twitter,
      tiktok: this.event.tiktokUrl ?? (this.event as any).tiktok,
      youtube: this.event.youtubeUrl ?? (this.event as any).youtube,
      website:
        this.event.websiteUrl ??
        (this.event as any).website ??
        (this.event as any).web ??
        (this.event as any).sitioWeb ??
        (this.event as any).paginaWeb,
      linkedin: this.event.linkedinUrl ?? (this.event as any).linkedin
    };

    for (const [rawKey, rawValue] of Object.entries(flatSources)) {
      const key = this.normalizeSocialKey(rawKey);
      const url = this.normalizeSocialUrl(key, rawValue);
      if (key && url && !socialMap.has(key)) {
        socialMap.set(key, url);
      }
    }

    this.socialEntries = Array.from(socialMap.entries()).map(([key, url]) => {
      const meta = this.getSocialMeta(key);
      return {
        key,
        url,
        label: meta.label,
        icon: meta.icon
      };
    });
  }

  private getSocialMeta(key: string): { label: string; icon: string } {
    switch (key) {
      case 'facebook':
        return { label: 'Facebook', icon: 'f' };
      case 'instagram':
        return { label: 'Instagram', icon: '◎' };
      case 'whatsapp':
        return { label: 'WhatsApp', icon: '✆' };
      case 'x':
        return { label: 'X', icon: '𝕏' };
      case 'tiktok':
        return { label: 'TikTok', icon: '♪' };
      case 'youtube':
        return { label: 'YouTube', icon: '▶' };
      case 'website':
        return { label: 'Sitio web', icon: '↗' };
      case 'linkedin':
        return { label: 'LinkedIn', icon: 'in' };
      default:
        return { label: 'Enlace', icon: '↗' };
    }
  }

  private normalizeSocialKey(rawKey: string): string | null {
    const key = rawKey.toLowerCase().trim().replace(/[\s_-]/g, '');

    const aliases: Record<string, string> = {
      facebook: 'facebook',
      facebookurl: 'facebook',

      instagram: 'instagram',
      instagramurl: 'instagram',
      ig: 'instagram',

      whatsapp: 'whatsapp',
      whatsappurl: 'whatsapp',
      wa: 'whatsapp',

      x: 'x',
      xurl: 'x',
      twitter: 'x',
      twitterurl: 'x',

      tiktok: 'tiktok',
      tiktokurl: 'tiktok',

      youtube: 'youtube',
      youtubeurl: 'youtube',

      website: 'website',
      websiteurl: 'website',
      web: 'website',
      url: 'website',
      sitioweb: 'website',
      paginaweb: 'website',
      link: 'website',

      linkedin: 'linkedin',
      linkedinurl: 'linkedin'
    };

    return aliases[key] ?? null;
  }

  private normalizeSocialUrl(
    platform: string | null,
    value: unknown
  ): string | null {
    if (!platform || typeof value !== 'string') return null;

    let raw = value.trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    if (platform === 'whatsapp') {
      const digits = raw.replace(/[^\d]/g, '');
      return digits ? `https://wa.me/${digits}` : null;
    }

    if (platform === 'website') {
      return `https://${raw.replace(/^\/+/, '')}`;
    }

    if (raw.startsWith('@')) {
      raw = raw.slice(1);
    }

    if (raw.includes('.') && !raw.includes(' ')) {
      return `https://${raw}`;
    }

    const bases: Record<string, string> = {
      facebook: 'https://facebook.com/',
      instagram: 'https://instagram.com/',
      x: 'https://x.com/',
      tiktok: 'https://tiktok.com/@',
      youtube: 'https://youtube.com/@',
      linkedin: 'https://linkedin.com/in/'
    };

    const base = bases[platform];
    if (!base) return null;

    return `${base}${raw}`;
  }

  private toSafeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private loadClima(): void {
    const ciudad = (this.event?.ciudad || '').trim();

    this.climaSubscription?.unsubscribe();

    if (!ciudad) {
      this.clima = null;
      this.climaLoading = false;
      this.climaError = false;
      return;
    }

    this.climaLoading = true;
    this.climaError = false;

    try {
      this.climaSubscription = this.weatherService.getClima(ciudad).subscribe({
        next: (c) => {
          this.clima = c;
          this.climaLoading = false;
        },
        error: () => {
          this.clima = null;
          this.climaLoading = false;
          this.climaError = true;
        }
      });
    } catch (_) {
      this.clima = null;
      this.climaLoading = false;
      this.climaError = true;
    }
  }
}
