import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { WeatherService, ClimaResponse } from '../services/weather.service';

// ✅ NUEVO
import Swal from 'sweetalert2';
import { AuthService, UserData } from '../services/auth.service';
import { InscripcionService } from '../services/inscripcion.service';

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

  // ✅ NUEVO: para bloquear en UI si soy organizador
  idOrganizador?: number | null;
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

  clima: ClimaResponse | null = null;
  climaLoading = false;
  climaError = false;

  // ✅ NUEVO: estado de auth + inscripción
  isLoggedIn = false;
  user: UserData | null = null;
  isRegistered = false;
  isJoining = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService,
    private weatherService: WeatherService,

    // ✅ NUEVO
    private auth: AuthService,
    private inscripcionService: InscripcionService
  ) {}

  ngOnInit(): void {
    // ✅ NUEVO: escuchar auth
    this.auth.isLoggedIn$.subscribe(v => {
      this.isLoggedIn = v;
      // si se desloguea, resetea estado visual
      if (!v) this.isRegistered = false;
    });

    this.auth.userData$.subscribe(u => {
      this.user = u;
    });

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

    this.clima = null;
    this.climaLoading = false;
    this.climaError = false;

    // ✅ NUEVO: al cargar evento, resetea registro (luego se recalcula)
    this.isRegistered = false;

    this.eventoService.obtenerEventoPorId(id).subscribe({
      next: (e: any) => {
        this.evento = this.mapToVM(e);
        this.isLoading = false;

        this.loadClimaForEvento();

        // ✅ NUEVO: si estoy logueado, revisa si ya estaba inscrito
        this.loadIsRegistered();
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

  private loadClimaForEvento(): void {
    if (!this.evento) return;

    if (this.evento.eventoEnLinea) {
      this.clima = null;
      this.climaLoading = false;
      this.climaError = false;
      return;
    }

    const ciudad = (this.evento.ciudad || '').trim();
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

    const idEvento = e?.idEvento ?? e?.id ?? e?.id_evento ?? undefined;

    // ✅ NUEVO: sacar idOrganizador si viene del backend
    const idOrganizador =
      e?.organizador?.idUsuario ??
      e?.idOrganizador ??
      e?.organizadorId ??
      null;

    return {
      id: idEvento,
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

      eventoPublico: e?.eventoPublico !== false,
      detallePrivado: e?.detallePrivado ?? '',

      permitirComentarios: e?.permitirComentarios !== false,
      recordatoriosAutomaticos: Boolean(e?.recordatoriosAutomaticos),

      idOrganizador: idOrganizador != null ? Number(idOrganizador) : null
    };
  }

  // =========================
  // ✅ NUEVO: helpers del botón
  // =========================
  get isOrganizer(): boolean {
    const myId = this.user?.id;
    const orgId = this.evento?.idOrganizador;
    return myId != null && orgId != null && Number(myId) === Number(orgId);
  }

  // Si cupo es null -> no bloqueamos por cupo en UI
  // (el backend igual valida si aplica)
  get cupoLleno(): boolean {
    if (!this.evento) return false;
    if (this.evento.cupo == null) return false;
    if (this.evento.cupo <= 0) return false; // cupo 0 lo tratamos como "sin cupo fijo" visualmente
    // Como no tienes "asistentesCount" en VM, no podemos calcular exacto en UI.
    // El backend es quien manda aquí.
    return false;
  }

  private loadIsRegistered(): void {
    if (!this.evento?.id) return;
    if (!this.isLoggedIn) return;
    if (!this.user?.id) return;

    this.inscripcionService.getMisInscripciones().subscribe({
      next: (list) => {
        const eventoId = Number(this.evento?.id);
        const userId = Number(this.user?.id);

        this.isRegistered = Array.isArray(list) && list.some(i =>
          Number(i?.evento?.idEvento) === eventoId &&
          Number(i?.usuario?.idUsuario) === userId
        );
      },
      error: () => {
        // si falla, no bloqueamos
        this.isRegistered = false;
      }
    });
  }

  onJoin(): void {
    if (!this.evento?.id) return;

    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Debes iniciar sesión para inscribirte.',
        confirmButtonText: 'Ok'
      });
      return;
    }

    if (this.isOrganizer) {
      Swal.fire({
        icon: 'warning',
        title: 'Eres el organizador',
        text: 'No puedes inscribirte a tu propio evento.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.isRegistered || this.isJoining) return;

    this.isJoining = true;

    this.inscripcionService.inscribirme(Number(this.evento.id)).subscribe({
      next: () => {
        this.isRegistered = true;

        Swal.fire({
          icon: 'success',
          title: '¡Inscripción exitosa!',
          text: 'Ya quedaste inscrito al evento.',
          timer: 1600,
          showConfirmButton: false
        });
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.error ||
          'No se pudo inscribir. Intenta de nuevo.';

        Swal.fire({
          icon: 'error',
          title: 'No se pudo inscribir',
          text: msg,
          confirmButtonText: 'Ok'
        });

        // si backend devuelve 409 porque ya estaba inscrito, reflejamos estado:
        if (err?.status === 409) this.isRegistered = true;
      },
      complete: () => {
        this.isJoining = false;
      }
    });
  }

  // Helpers para UI existentes
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
