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
    imageUrl: ''
  };

  clima: ClimaResponse | null = null;
  climaLoading = false;
  climaError = false;

  constructor(private weatherService: WeatherService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event']) this.loadClima();
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
