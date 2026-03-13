import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { WeatherService, ClimaResponse } from '../services/weather.service';
import { ToastService } from '../shared/toast/toast.service';

import Swal from 'sweetalert2';
import { AuthService, UserData } from '../services/auth.service';
import { InscripcionService } from '../services/inscripcion.service';
import { FormsModule } from '@angular/forms';

import {
  EventoCommentService,
  EventoCommentResponse,
  PageResponse
} from '../services/evento-comment.service';

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

  idOrganizador?: number | null;
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FormsModule],
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

  isLoggedIn = false;
  user: UserData | null = null;
  isRegistered = false;
  isJoining = false;

  canManage = false;
  editMode = false;
  form: EventoVM = this.getEmptyForm();

  comentarios: EventoCommentResponse[] = [];
  comentariosPage = 0;
  comentariosSize = 10;
  comentariosTotalPages = 0;
  comentariosTotalElements = 0;
  nuevoComentario = '';
  comentariosLoading = false;
  comentariosErrorMsg = '';
  nuevaImagenComentario: File | null = null;
  nuevoComentarioPreviewUrl = '';

  private getEmptyForm(): EventoVM {
    return {
      id: undefined,
      titulo: '',
      descripcion: '',
      categoria: '',
      imagenUrl: '',

      fecha: '',
      horaInicio: '',
      horaFin: '',

      eventoEnLinea: false,
      urlVirtual: '',

      ubicacion: '',
      nombreLugar: '',
      direccionCompleta: '',
      ciudad: '',

      cupo: null,
      eventoGratuito: false,
      precio: null,

      emailContacto: '',
      telefonoContacto: '',
      sitioWeb: '',

      eventoPublico: true,
      detallePrivado: '',

      permitirComentarios: true,
      recordatoriosAutomaticos: false,

      idOrganizador: null
    };
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService,
    private weatherService: WeatherService,
    private toast: ToastService,
    private auth: AuthService,
    private inscripcionService: InscripcionService,
    private commentService: EventoCommentService
  ) {}

  ngOnInit(): void {
    this.auth.isLoggedIn$.subscribe(v => {
      this.isLoggedIn = v;
      if (!v) this.isRegistered = false;
    });

    this.auth.userData$.subscribe(u => {
      this.user = u;
      this.canManage = this.isOrganizer;
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

    this.isRegistered = false;

    this.resetComentarios();

    this.eventoService.obtenerEventoPorId(id).subscribe({
      next: (e: any) => {
        this.evento = this.mapToVM(e);
        this.canManage = this.isOrganizer;
        this.form = { ...this.getEmptyForm(), ...this.evento };
        this.isLoading = false;

        this.loadClimaForEvento();
        this.loadIsRegistered();

        if (this.evento?.permitirComentarios !== false && this.evento?.id) {
          this.cargarComentarios();
        }
      },
      error: (err) => {
        this.isLoading = false;

        console.error('Error cargando evento por id:', err);
        console.error('status:', err?.status);
        console.error('body:', err?.error);

        if (err?.status === 404) {
          this.errorMsg = 'No se encontró el evento.';
          return;
        }

        if (err?.status === 401) {
          this.errorMsg = 'Tu sesión no es válida o expiró. Cierra sesión y vuelve a entrar.';
          return;
        }

        if (err?.status === 403) {
          this.errorMsg = 'No tienes permisos para ver este evento.';
          return;
        }

        this.errorMsg =
          err?.error?.message ||
          err?.error?.error ||
          'No se pudo cargar el evento. Revisa la consola.';
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

    const idOrganizador =
      e?.idOrganizador ??
      e?.organizador?.idUsuario ??
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

  get isOrganizer(): boolean {
    const myId = this.user?.id;
    const orgId = this.evento?.idOrganizador;
    return myId != null && orgId != null && Number(myId) === Number(orgId);
  }

  get cupoLleno(): boolean {
    if (!this.evento) return false;
    if (this.evento.cupo == null) return false;
    if (this.evento.cupo <= 0) return false;
    return false;
  }

  private loadIsRegistered(): void {
    if (!this.evento?.id) return;
    if (!this.isLoggedIn) return;

    this.inscripcionService.getMisInscripciones().subscribe({
      next: (list) => {
        const eventoId = Number(this.evento?.id);

        this.isRegistered = Array.isArray(list) && list.some(i =>
          Number(i?.idEvento) === eventoId
        );
      },
      error: () => {
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

        if (err?.status === 409) this.isRegistered = true;
      },
      complete: () => {
        this.isJoining = false;
      }
    });
  }

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

  empezarEditar(): void {
    if (!this.evento) return;

    this.editMode = true;
    this.form = { ...this.evento };

    if (this.form.fecha) {
      this.form.fecha = String(this.form.fecha).slice(0, 10);
    }

    if (this.form.horaInicio) {
      this.form.horaInicio = String(this.form.horaInicio).slice(0, 5);
    }

    if (this.form.horaFin) {
      this.form.horaFin = String(this.form.horaFin).slice(0, 5);
    }
  }

  cancelarEditar(): void {
    this.editMode = false;
    this.form = this.evento ? { ...this.getEmptyForm(), ...this.evento } : this.getEmptyForm();
  }

  private buildUpdatePayload(): Record<string, unknown> | null {
    const fecha = this.normalizeDateTime(this.form.fecha, this.form.horaInicio);
    const horaInicio = this.normalizeTimeOrNull(this.form.horaInicio);
    const horaFin = this.normalizeTimeOrNull(this.form.horaFin);

    if (!this.form.titulo?.trim()) {
      this.toast.show('El título es obligatorio.', 'error');
      return null;
    }

    if (!fecha || !horaInicio || !horaFin) {
      this.toast.show('Fecha, hora inicio y hora fin son obligatorias.', 'error');
      return null;
    }

    if (this.form.cupo == null || Number(this.form.cupo) <= 0) {
      this.toast.show('El cupo debe ser mayor a 0.', 'error');
      return null;
    }

    if (this.form.eventoEnLinea && !this.form.urlVirtual?.trim()) {
      this.toast.show('La URL virtual es obligatoria para eventos en línea.', 'error');
      return null;
    }

    if (!this.form.eventoEnLinea && !this.form.ubicacion?.trim()) {
      this.toast.show('La ubicación es obligatoria para eventos presenciales.', 'error');
      return null;
    }

    if (!this.form.eventoGratuito && (this.form.precio == null || Number(this.form.precio) <= 0)) {
      this.toast.show('El precio debe ser mayor a 0.', 'error');
      return null;
    }

    if (!this.form.eventoPublico && !this.form.detallePrivado?.trim()) {
      this.toast.show('El detalle privado es obligatorio para eventos privados.', 'error');
      return null;
    }

    const payload: Record<string, unknown> = {
      titulo: this.trimOrNull(this.form.titulo),
      descripcion: this.trimOrNull(this.form.descripcion),
      categoria: this.trimOrNull(this.form.categoria),
      fecha,
      horaInicio,
      horaFin,
      eventoEnLinea: Boolean(this.form.eventoEnLinea),
      urlVirtual: this.form.eventoEnLinea ? this.trimOrNull(this.form.urlVirtual) : null,
      ubicacion: this.form.eventoEnLinea ? null : this.trimOrNull(this.form.ubicacion),
      nombreLugar: this.form.eventoEnLinea ? null : this.trimOrNull(this.form.nombreLugar),
      direccionCompleta: this.form.eventoEnLinea ? null : this.trimOrNull(this.form.direccionCompleta),
      ciudad: this.form.eventoEnLinea ? null : this.trimOrNull(this.form.ciudad),
      cupo: Number(this.form.cupo),
      eventoGratuito: Boolean(this.form.eventoGratuito),
      precio: this.form.eventoGratuito ? null : Number(this.form.precio),
      emailContacto: this.trimOrNull(this.form.emailContacto),
      telefonoContacto: this.trimOrNull(this.form.telefonoContacto),
      sitioWeb: this.trimOrNull(this.form.sitioWeb),
      eventoPublico: Boolean(this.form.eventoPublico),
      detallePrivado: this.form.eventoPublico ? null : this.trimOrNull(this.form.detallePrivado),
      permitirComentarios: Boolean(this.form.permitirComentarios),
      recordatoriosAutomaticos: Boolean(this.form.recordatoriosAutomaticos)
    };

    return payload;
  }

  private trimOrNull(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private normalizeTimeOrNull(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized.slice(0, 5) : null;
  }

  private normalizeDateTime(dateValue: unknown, timeValue: unknown): string | null {
    const date = String(dateValue ?? '').trim();
    const time = this.normalizeTimeOrNull(timeValue);

    if (!date || !time) {
      return null;
    }

    return `${date}T${time}:00`;
  }

  guardarCambios(): void {
    if (!this.evento?.id) return;

    const payload = this.buildUpdatePayload();
    if (!payload) return;

    this.eventoService.actualizarEvento(Number(this.evento.id), payload).subscribe({
      next: (actualizado: any) => {
        this.evento = this.mapToVM(actualizado);
        this.editMode = false;
        this.form = { ...this.evento };
        this.toast.show('¡Editado exitosamente! ✨', 'success');
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.error ||
          'No se pudo editar el evento.';
        this.toast.show(msg, 'error');
        console.error('Error editando evento:', err);
      }
    });
  }

  eliminarEvento(): void {
    if (!this.evento?.id) return;

    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar evento?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.eventoService.eliminarEvento(Number(this.evento!.id)).subscribe({
        next: () => {
          this.toast.show('¡Eliminado exitosamente! 🗑️', 'success');
          this.router.navigate(['/explore']);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.error ||
            'No se pudo eliminar el evento.';
          this.toast.show(msg, 'error');
          console.error('Error eliminando evento:', err);
        }
      });
    });
  }

  private resetComentarios(): void {
    this.comentarios = [];
    this.comentariosPage = 0;
    this.comentariosTotalPages = 0;
    this.comentariosTotalElements = 0;
    this.nuevoComentario = '';
    this.comentariosLoading = false;
    this.comentariosErrorMsg = '';
    this.limpiarImagenComentario();
  }

  cargarComentarios(): void {
    const eventoId = Number(this.evento?.id);
    if (!eventoId) return;

    this.comentariosLoading = true;
    this.comentariosErrorMsg = '';

    this.commentService.listar(eventoId, this.comentariosPage, this.comentariosSize).subscribe({
      next: (res: PageResponse<EventoCommentResponse>) => {
        this.comentarios = res.content || [];
        this.comentariosTotalPages = res.totalPages ?? 0;
        this.comentariosTotalElements = res.totalElements ?? 0;
        this.comentariosLoading = false;
      },
      error: (err) => {
        this.comentariosLoading = false;
        this.comentariosErrorMsg = err?.error?.message || 'No se pudieron cargar comentarios';
      }
    });
  }

  publicarComentario(): void {
    if (!this.evento?.id) return;

    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Debes iniciar sesión para comentar.',
        confirmButtonText: 'Ok'
      });
      return;
    }

    if (this.evento?.permitirComentarios === false) {
      this.toast.show('Este evento no permite comentarios', 'error');
      return;
    }

    const texto = this.nuevoComentario.trim();
    if (!texto && !this.nuevaImagenComentario) return;

    this.comentariosLoading = true;
    this.comentariosErrorMsg = '';

    this.commentService.crear(Number(this.evento.id), texto, this.nuevaImagenComentario).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.limpiarImagenComentario();
        this.comentariosPage = 0;
        this.cargarComentarios();
      },
      error: (err) => {
        this.comentariosLoading = false;
        this.comentariosErrorMsg = err?.error?.message || 'No se pudo publicar el comentario';
      }
    });
  }

  puedeBorrar(c: EventoCommentResponse): boolean {
    const myId = this.user?.id;
    return this.isLoggedIn && myId != null && Number(myId) === Number(c.usuarioId);
  }

  eliminarComentario(id: number): void {
    if (!id) return;

    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Debes iniciar sesión.',
        confirmButtonText: 'Ok'
      });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar comentario?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.comentariosLoading = true;
      this.comentariosErrorMsg = '';

      this.commentService.eliminar(id).subscribe({
        next: () => this.cargarComentarios(),
        error: (err) => {
          this.comentariosLoading = false;
          this.comentariosErrorMsg = err?.error?.message || 'No se pudo eliminar';
        }
      });
    });
  }

  comentariosPrev(): void {
    if (this.comentariosPage <= 0) return;
    this.comentariosPage--;
    this.cargarComentarios();
  }

  comentariosNext(): void {
    if (this.comentariosPage >= this.comentariosTotalPages - 1) return;
    this.comentariosPage++;
    this.cargarComentarios();
  }

  onComentarioImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.limpiarImagenComentario();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toast.show('Solo puedes subir imágenes en el comentario', 'error');
      input.value = '';
      return;
    }

    this.nuevaImagenComentario = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.nuevoComentarioPreviewUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  limpiarImagenComentario(input?: HTMLInputElement): void {
    this.nuevaImagenComentario = null;
    this.nuevoComentarioPreviewUrl = '';
    if (input) input.value = '';
  }

  comentarioImagenUrl(c: EventoCommentResponse): string {
    return this.commentService.getFullImageUrl(c.imagenUrl);
  }
}