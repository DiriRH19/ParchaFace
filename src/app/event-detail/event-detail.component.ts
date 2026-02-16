import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {
  event: any = null;
  showSuccessMessage: boolean = false;
  isOrganizer = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private eventoService: EventoService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (id) {
      this.eventoService.obtenerEventoPorId(id).subscribe({
        next: (e: any) => {
          this.event = this.mapEvent(e);
          const me = this.authService.getUserData();
          this.isOrganizer = !!(me && this.event && this.event.organizer && (me.id === this.event.organizer.id || me.usuario === this.event.organizer.usuario));
        },
        error: err => {
          console.error('Error cargando evento', err);
        }
      });
    }
  }

  private mapEvent(e: any) {
    return {
      id: e.id,
      title: e.titulo || e.title,
      category: e.categoria || e.category,
      description: e.descripcion || e.description,
      tags: e.tags || e.etiquetas || [],
      price: e.precio ? (typeof e.precio === 'number' ? `$${e.precio}` : String(e.precio)) : (e.eventoGratuito ? 'Gratis' : '—'),
      attendees: e.cupo ? `${e.cupo} cupo` : '',
      date: e.fecha || '',
      time: (e.horaInicio || '') + (e.horaFin ? ` - ${e.horaFin}` : ''),
      location: e.nombreLugar || e.ubicacion || '',
      address: e.direccionCompleta || '',
      attending: e.asistentes || '',
      rating: e.rating || 0,
      lineup: e.lineup || e.artistas || [],
      experiences: e.experiencias || [],
      includes: e.includes || e.incluye || [],
      organizer: e.organizador || e.organizer || {
        id: e.organizadorId || e.organizerId,
        name: (e.organizador && e.organizador.nombre) || (e.organizer && e.organizer.name) || '',
        rating: (e.organizador && e.organizador.rating) || (e.organizer && e.organizer.rating) || 0,
        followers: (e.organizador && e.organizador.followers) || (e.organizer && e.organizer.followers) || 0,
        events: (e.organizador && e.organizador.events) || (e.organizer && e.organizer.events) || 0,
        email: (e.organizador && e.organizador.email) || (e.organizer && e.organizer.email) || '',
        phone: (e.organizador && e.organizador.phone) || (e.organizer && e.organizer.phone) || '',
        website: (e.organizador && e.organizador.website) || (e.organizer && e.organizer.website) || ''
      }
    };
  }

  onRegisterClick(): void {
    if (this.isOrganizer) return;

    if (this.authService.getIsLoggedIn()) {
      this.registerToEvent();
    } else {
      this.router.navigate(['/login']);
    }
  }

  private registerToEvent(): void {
    this.showSuccessMessage = true;

    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 5000);
  }
}

