import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface Event {
  id?: number;
  title: string;
  description: string;
  date: string;
  location: string;
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
  imports: [CommonModule, NgIf, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.css']
})
export class EventCardComponent implements OnChanges {

  /**
   * Puede venir:
   * - Formato card (title/date/location...)
   * - Formato backend (titulo/fecha/horaInicio/ubicacion/imagenPortadaUrl...)
   */
  @Input() event: any = null;

  normalizedEvent: Event = {
    title: 'Evento',
    description: '',
    date: '',
    location: '',
    attendees: '',
    category: '',
    tags: [],
    price: 'Gratis',
    rating: 0
  };

  // Para evitar el ícono de imagen rota
  imageOk = true;

  ngOnChanges(): void {
    this.normalizedEvent = this.normalizeEvent(this.event);
    this.imageOk = !!this.normalizedEvent.imageUrl; // si no hay url, mostramos placeholder
  }

  onImgError() {
    this.imageOk = false;
  }

  private normalizeEvent(raw: any): Event {
    if (!raw) {
      return {
        title: 'Evento',
        description: '',
        date: '',
        location: '',
        attendees: '',
        category: '',
        tags: [],
        price: 'Gratis',
        rating: 0
      };
    }

    // Si ya viene en formato card
    if (raw.title || raw.date || raw.location !== undefined) {
      return {
        id: raw.id ?? raw.idEvento ?? raw.eventId ?? undefined,
        title: raw.title ?? 'Evento',
        description: raw.description ?? '',
        date: raw.date ?? '',
        location: raw.location ?? '',
        attendees: raw.attendees ?? '',
        category: raw.category ?? '',
        tags: raw.tags ?? [],
        price: raw.price ?? 'Gratis',
        rating: Number(raw.rating ?? 0),
        imageUrl: raw.imageUrl ?? raw.image ?? raw.imagenPortadaUrl ?? ''
      };
    }

    // Formato backend
    const id = raw.idEvento ?? raw.id ?? raw.id_evento ?? undefined;

    const titulo = raw.titulo ?? 'Evento';
    const descripcion = raw.descripcion ?? '';
    const categoria = raw.categoria ?? '';

    const fecha = raw.fecha ? String(raw.fecha) : '';
    const horaInicio = raw.horaInicio ? String(raw.horaInicio) : '';
    const dateStr = [fecha, horaInicio].filter(Boolean).join(' ').trim();

    const enLinea = raw.eventoEnLinea === true;
    const location = enLinea
      ? (raw.urlVirtual ?? 'En línea')
      : (raw.nombreLugar ?? raw.ubicacion ?? raw.ciudad ?? 'Presencial');

    const cupo = raw.cupo != null ? String(raw.cupo) : '';
    const attendees = cupo ? `${cupo} asistentes` : '';

    const price = raw.eventoGratuito === true
      ? 'Gratis'
      : (raw.precio != null ? `$${raw.precio}` : 'Pago');

    const imageUrl =
      raw.imageUrl ??
      raw.imagenPortadaUrl ??
      raw.imagenPortadaURL ??
      raw.portada ??
      raw.imagenUrl ??
      '';

    return {
      id,
      title: titulo,
      description: descripcion,
      date: dateStr,
      location,
      attendees,
      category: categoria,
      tags: raw.tags ?? [],
      price,
      rating: Number(raw.rating ?? 0),
      imageUrl: String(imageUrl || '')
    };
  }
}
