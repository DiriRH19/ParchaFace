import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';
import { NavbarComponent } from '../shared/navbar/navbar.component';

type EventoVM = {
  id?: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  imagenUrl: string;

  fecha: string;
  horaInicio: string;
  horaFin: string;

  eventoEnLinea: boolean;
  urlVirtual: string;

  ubicacion: string;
  nombreLugar: string;
  direccionCompleta: string;
  ciudad: string;

  cupo: number | null;
  eventoGratuito: boolean;
  precio: number | null;

  emailContacto: string;
  telefonoContacto: string;
  sitioWeb: string;

  eventoPublico: boolean;
  detallePrivado: string;

  permitirComentarios: boolean;
  recordatoriosAutomaticos: boolean;
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, NgIf, RouterLink, NavbarComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {
  isLoading = true;
  errorMsg = '';

  evento: EventoVM | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id) || id <= 0) {
      this.isLoading = false;
      this.errorMsg = 'ID de evento inválido.';
      return;
    }

    this.loadEvento(id);
  }

  volver(): void {
    this.router.navigate(['/explore']);
  }

  private loadEvento(id: number): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.eventoService.obtenerEventoPorId(id).subscribe({
      next: (e: any) => {
        this.evento = this.mapToVM(e);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;

        if (err?.status === 404) {
          this.errorMsg = 'No se encontró el evento.';
          return;
        }

        if (err?.status === 401) {
          this.errorMsg = 'Necesitas iniciar sesión para ver este evento.';
          return;
        }

        this.errorMsg = 'No se pudo cargar el evento. Revisa la consola.';
        console.error('Error cargando evento por id:', err);
      }
    });
  }

  private mapToVM(e: any): EventoVM {
    const rawImg =
      e?.imagenPortadaUrl ||
      e?.imagenPortadaURL ||
      e?.imagenPortada ||
      e?.portada ||
      e?.portadaUrl ||
      e?.imagenUrl ||
      e?.imageUrl ||
      e?.image ||
      '';

    const imagenUrl = this.eventoService.getFullImageUrl(String(rawImg || ''));

    return {
      id: e?.idEvento ?? e?.id ?? e?.id_evento ?? undefined,
      titulo: e?.titulo ?? 'Evento',
      descripcion: e?.descripcion ?? '',
      categoria: e?.categoria ?? '',
      imagenUrl,

      fecha: e?.fecha ? String(e.fecha) : '',
      horaInicio: e?.horaInicio ? String(e.horaInicio) : '',
      horaFin: e?.horaFin ? String(e.horaFin) : '',

      eventoEnLinea: Boolean(e?.eventoEnLinea),
      urlVirtual: e?.urlVirtual ?? '',

      ubicacion: e?.ubicacion ?? '',
      nombreLugar: e?.nombreLugar ?? '',
      direccionCompleta: e?.direccionCompleta ?? '',
      ciudad: e?.ciudad ?? '',

      cupo: e?.cupo != null ? Number(e.cupo) : null,
      eventoGratuito: Boolean(e?.eventoGratuito),
      precio: e?.precio != null ? Number(e.precio) : null,

      emailContacto: e?.emailContacto ?? '',
      telefonoContacto: e?.telefonoContacto ?? '',
      sitioWeb: e?.sitioWeb ?? '',

      eventoPublico: e?.eventoPublico !== false, // default true
      detallePrivado: e?.detallePrivado ?? '',

      permitirComentarios: e?.permitirComentarios !== false,
      recordatoriosAutomaticos: Boolean(e?.recordatoriosAutomaticos)
    };
  }

  // Helpers para UI
  get fechaHoraLabel(): string {
    if (!this.evento) return '';
    const f = this.evento.fecha || '—';
    const hi = this.evento.horaInicio || '—';
    const hf = this.evento.horaFin ? ` - ${this.evento.horaFin}` : '';
    return `${f} • ${hi}${hf}`;
  }

  get precioLabel(): string {
    if (!this.evento) return '';
    if (this.evento.eventoGratuito) return 'Gratis';
    if (this.evento.precio != null && !Number.isNaN(this.evento.precio)) return `$${this.evento.precio}`;
    return 'Pago';
  }

  get ubicacionLabel(): string {
    if (!this.evento) return '';
    if (this.evento.eventoEnLinea) return this.evento.urlVirtual || 'En línea';
    return (
      this.evento.nombreLugar ||
      this.evento.ubicacion ||
      this.evento.ciudad ||
      'Presencial'
    );
  }
}
