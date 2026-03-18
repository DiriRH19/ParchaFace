import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  imageUrl?: string;

  registeredCount?: number | null;
  capacity?: number | null;
}

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.css']
})
export class EventCardComponent implements OnChanges {
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
    registeredCount: null,
    capacity: null
  };

  clima: ClimaResponse | null = null;
  climaLoading = false;
  climaError = false;

  constructor(private weatherService: WeatherService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event']) this.loadClima();
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

  private toSafeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private loadClima(): void {
    const ciudad = (this.event?.ciudad || '').trim();
    if (!ciudad) {
      this.clima = null;
      this.climaLoading = false;
      this.climaError = false;
      return;
    }

    this.climaLoading = true;
    this.climaError = false;

    try {
      this.weatherService.getClima(ciudad).subscribe({
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

  onImgError(): void {
    this.event.imageUrl = '';
  }
}
