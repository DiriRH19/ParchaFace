import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { NavbarComponent } from '../shared/navbar/navbar.component';
import { EventoService } from '../services/evento';
import { InscripcionService, InscritoEvento } from '../services/inscripcion.service';

@Component({
  selector: 'app-event-attendees',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent],
  templateUrl: './event-attendees.component.html',
  styleUrls: ['./event-attendees.component.css']
})
export class EventAttendeesComponent implements OnInit {
  eventId = 0;
  eventTitle = '';
  loading = true;
  error = '';
  search = '';
  inscritos: InscritoEvento[] = [];

  constructor(
    private route: ActivatedRoute,
    private eventoService: EventoService,
    private inscripcionService: InscripcionService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      if (!id || Number.isNaN(id)) {
        this.error = 'Evento inválido.';
        this.loading = false;
        return;
      }

      this.eventId = id;
      this.cargarVista();
    });
  }

  get inscritosFiltrados(): InscritoEvento[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.inscritos;

    return this.inscritos.filter(inscrito => {
      const nombre = (inscrito.nombre || '').toLowerCase();
      const correo = (inscrito.correo || '').toLowerCase();
      const acerca = (inscrito.acercaDe || '').toLowerCase();
      return nombre.includes(term) || correo.includes(term) || acerca.includes(term);
    });
  }

  get totalInscritos(): number {
    return this.inscritos.length;
  }

  getFoto(path?: string | null): string {
    return this.eventoService.getFullImageUrl(path || '');
  }

  recargar(): void {
    this.cargarVista();
  }

  private cargarVista(): void {
    this.loading = true;
    this.error = '';
    this.inscritos = [];

    forkJoin({
      evento: this.eventoService.obtenerEventoPorId(this.eventId),
      inscritos: this.inscripcionService.obtenerInscritosEvento(this.eventId)
    }).subscribe({
      next: ({ evento, inscritos }) => {
        this.eventTitle = evento?.titulo || 'Evento';
        this.inscritos = inscritos ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando inscritos del evento:', err);
        this.loading = false;

        if (err?.status === 403) {
          this.error = 'No tienes permiso para ver los inscritos de este evento.';
          return;
        }

        if (err?.status === 404) {
          this.error = 'No se encontró el evento.';
          return;
        }

        this.error = err?.error?.message || err?.error?.error || 'No se pudo cargar la lista de inscritos.';
      }
    });
  }
}