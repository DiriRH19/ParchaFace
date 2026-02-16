import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCardComponent, Event } from '../event-card/event-card.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, EventCardComponent, NavbarComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {
  events: Event[] = [];
  isLoading = false;
  authRequired = false;
  private authWarned = false;

  constructor(private eventoService: EventoService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  // ✅ Método público para refrescar eventos
  refreshEvents() {
    this.loadEvents();
  }

  private loadEvents() {
    this.isLoading = true;
    this.eventoService.obtenerEventos().subscribe({
      next: (list: any[]) => {
        this.events = (list || []).map(e => ({
          title: e.titulo || e.title || 'Evento',
          description: e.descripcion || e.description || '',
          date: (e.fecha ? String(e.fecha) : '') + (e.horaInicio ? ` ${e.horaInicio}` : ''),
          location: e.nombreLugar || e.ubicacion || e.ciudad || '',
          attendees: e.cupo ? `${e.cupo} asistentes` : '',
          category: e.categoria || '',
          tags: e.tags || [],
          price: e.precio ? (typeof e.precio === 'number' ? `$${e.precio}` : String(e.precio)) : (e.eventoGratuito ? 'Gratis' : ''),
          rating: e.rating || 0,
          imageUrl: this.eventoService.getFullImageUrl(e.imagenPortadaUrl || e.imagenUrl || e.portada || '')
        } as Event));
        this.isLoading = false;
      },
      error: err => {
        // Mostrar un mensaje conciso en consola y en UI cuando la API requiere autenticación.
        if (err && err.status === 401) {
          this.authRequired = true;
          this.isLoading = false;
          if (!this.authWarned) {
            console.warn('API requiere autenticación para cargar eventos (401).');
            this.authWarned = true;
          }
          // Usar seed local para desarrollo en vez de dejar la lista vacía
          try {
            this.events = this.eventoService.getSeedEvents() || [];
            console.info('Mostrando eventos de desarrollo (seed) porque la API requirió autenticación.');
          } catch (e) {
            // fallback: dejar lista vacía
            this.events = [];
          }
          return;
        }

        console.error('Error cargando eventos', err && err.message ? err.message : err);
        this.isLoading = false;
      }
    });
  }
}
