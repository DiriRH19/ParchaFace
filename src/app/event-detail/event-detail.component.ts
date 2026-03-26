import { Component, OnDestroy, OnInit } from '@angular/core';
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
  imageUrls?: string[];
  socialLinks?: Record<string, string> | null;

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

type SocialEntry = {
  key: string;
  label: string;
  icon: string;
  url: string;
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FormsModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit, OnDestroy {
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

  currentImageIndex = 0;
  private imageRotationTimer: ReturnType<typeof setInterval> | null = null;
  private readonly imageRotationMs = 4000;

  private getEmptyForm(): EventoVM {
    return {
      id: undefined,
      titulo: '',
      descripcion: '',
      categoria: '',
      imagenUrl: '',
      imageUrls: [],
      socialLinks: null,

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

      if (!v) {
        this.isRegistered = false;
        return;
      }

      if (this.evento?.id) {
        this.loadIsRegistered();
      }
    });

    this.auth.userData$.subscribe(u => {
      this.user = u;
      this.canManage = this.isOrganizer;

      if (this.isLoggedIn && this.evento?.id) {
        this.loadIsRegistered();
      }
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

  ngOnDestroy(): void {
    this.stopImageRotation();
  }

  volver(): void {
    this.router.navigate(['/explore']);
  }

  get displayedImage(): string | null {
    return this.evento?.imageUrls?.[this.currentImageIndex] || this.evento?.imagenUrl || null;
  }

  get hasMultipleImages(): boolean {
    return (this.evento?.imageUrls?.length || 0) > 1;
  }

  get socialEntries(): SocialEntry[] {
    const links = this.evento?.socialLinks;
    if (!links) return [];

    return Object.entries(links)
      .map(([rawKey, rawUrl]) => {
        const key = this.normalizeSocialKey(rawKey);
        if (!key || !rawUrl) return null;

        const meta = this.getSocialMeta(key);
        return {
          key,
          url: rawUrl,
          label: meta.label,
          icon: meta.icon
        };
      })
      .filter((entry): entry is SocialEntry => !!entry);
  }

  goToImage(index: number): void {
    const total = this.evento?.imageUrls?.length || 0;
    if (index < 0 || index >= total) return;

    this.currentImageIndex = index;
    this.restartImageRotation();
  }

  onMainImageError(): void {
    if (!this.evento?.imageUrls?.length) {
      if (this.evento) this.evento.imagenUrl = '';
      return;
    }

    this.evento.imageUrls = this.evento.imageUrls.filter(
      (_, index) => index !== this.currentImageIndex
    );

    if (!this.evento.imageUrls.length) {
      this.evento.imagenUrl = '';
      this.currentImageIndex = 0;
      this.stopImageRotation();
      return;
    }

    this.evento.imagenUrl = this.evento.imageUrls[0] || '';

    if (this.currentImageIndex >= this.evento.imageUrls.length) {
      this.currentImageIndex = 0;
    }

    this.restartImageRotation();
  }

  private loadEvento(id: number): void {
    this.isLoading = true;
    this.errorMsg = '';

    this.clima = null;
    this.climaLoading = false;
    this.climaError = false;

    this.isRegistered = this.inscripcionService.estaInscritoLocal(id);

    this.resetComentarios();

    this.eventoService.obtenerEventoPorId(id).subscribe({
      next: (e: any) => {
        this.evento = this.mapToVM(e);
        this.canManage = this.isOrganizer;
        this.form = { ...this.getEmptyForm(), ...this.evento };
        this.syncImageGallery();
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
    const imageUrls = this.extractImageUrls(e);
    const imagenUrl = imageUrls[0] || '';

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
      imageUrls,
      socialLinks: this.extractSocialLinks(e),

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

  private extractImageUrls(e: any): string[] {
    const fromArray = Array.isArray(e?.imagenes)
      ? e.imagenes
        .map((img: any) =>
          this.eventoService.getFullImageUrl(
            String(img?.imageUrl || img?.imagenUrl || img?.url || '')
          )
        )
        .filter((url: string) => !!url)
      : [];

    const fromDirectArrays = [
      ...(Array.isArray(e?.imageUrls) ? e.imageUrls : []),
      ...(Array.isArray(e?.images) ? e.images : []),
      ...(Array.isArray(e?.galleryImages) ? e.galleryImages : [])
    ]
      .map((img: any) =>
        this.eventoService.getFullImageUrl(
          String(img?.imageUrl || img?.imagenUrl || img?.url || img || '')
        )
      )
      .filter((url: string) => !!url);

    const portada = this.eventoService.getFullImageUrl(
      String(
        e?.imagenPortadaUrl ||
        e?.imagenPortadaURL ||
        e?.imagenPortada ||
        e?.portada ||
        e?.portadaUrl ||
        e?.imagenUrl ||
        e?.imageUrl ||
        e?.image ||
        ''
      )
    );

    return Array.from(
      new Set([
        ...fromArray,
        ...fromDirectArrays,
        ...(portada ? [portada] : [])
      ].filter(Boolean))
    );
  }

  private extractSocialLinks(e: any): Record<string, string> | null {
    const links: Record<string, string> = {};

    const objectSources = [e?.socialLinks, e?.redesSociales, e?.socialMedia];

    for (const source of objectSources) {
      if (!source || typeof source !== 'object') continue;

      for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'string' && value.trim()) {
          links[key] = value.trim();
        }
      }
    }

    const flatSources: Record<string, unknown> = {
      facebook: e?.facebookUrl ?? e?.facebook,
      instagram: e?.instagramUrl ?? e?.instagram,
      whatsapp: e?.whatsappUrl ?? e?.whatsapp,
      x: e?.xUrl ?? e?.twitterUrl ?? e?.x ?? e?.twitter,
      tiktok: e?.tiktokUrl ?? e?.tiktok,
      youtube: e?.youtubeUrl ?? e?.youtube,
      website: e?.websiteUrl ?? e?.website ?? e?.web ?? e?.sitioWeb ?? e?.paginaWeb,
      linkedin: e?.linkedinUrl ?? e?.linkedin
    };

    for (const [key, value] of Object.entries(flatSources)) {
      if (typeof value === 'string' && value.trim()) {
        links[key] = value.trim();
      }
    }

    return Object.keys(links).length ? links : null;
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

  private syncImageGallery(): void {
    this.currentImageIndex = 0;
    this.restartImageRotation();
  }

  private restartImageRotation(): void {
    this.stopImageRotation();

    if ((this.evento?.imageUrls?.length || 0) <= 1) return;

    this.imageRotationTimer = setInterval(() => {
      const total = this.evento?.imageUrls?.length || 0;
      if (!total) return;

      this.currentImageIndex = (this.currentImageIndex + 1) % total;
    }, this.imageRotationMs);
  }

  private stopImageRotation(): void {
    if (this.imageRotationTimer) {
      clearInterval(this.imageRotationTimer);
      this.imageRotationTimer = null;
    }
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
    const eventoId = Number(this.evento?.id);

    if (!eventoId) {
      this.isRegistered = false;
      return;
    }

    if (!this.isLoggedIn) {
      this.isRegistered = false;
      return;
    }

    this.isRegistered = this.inscripcionService.estaInscritoLocal(eventoId);

    this.inscripcionService.getMisInscripciones().subscribe({
      next: (list) => {
        this.inscripcionService.sincronizarInscripciones(list);

        this.isRegistered =
          Array.isArray(list) &&
          list.some(i => {
            const id = Number(
              i?.idEvento ??
              i?.evento?.idEvento ??
              i?.evento?.id ??
              i?.eventoId
            );
            return !Number.isNaN(id) && id === eventoId;
          });
      },
      error: (err) => {
        console.error('Error cargando inscripciones:', err);
        this.isRegistered = this.inscripcionService.estaInscritoLocal(eventoId);
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

    Swal.fire({
      title: '¿Inscribirte al evento?',
      text: 'Aparecerás como inscrito en este evento.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, inscribirme',
      cancelButtonText: 'No'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.isJoining = true;

      this.inscripcionService.inscribirme(Number(this.evento!.id)).subscribe({
        next: () => {
          this.inscripcionService.marcarComoInscrito(Number(this.evento!.id));
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

          if (err?.status === 409) {
            this.inscripcionService.marcarComoInscrito(Number(this.evento!.id));
            this.isRegistered = true;
          }
        },
        complete: () => {
          this.isJoining = false;
        }
      });
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
        this.syncImageGallery();
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

  onCancelJoin(): void {
    if (!this.evento?.id || !this.isLoggedIn || !this.isRegistered) return;

    Swal.fire({
      title: '¿Cancelar inscripción?',
      text: 'Ya no aparecerás como inscrito en este evento.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.inscripcionService.cancelarInscripcion(Number(this.evento!.id)).subscribe({
        next: () => {
          this.isRegistered = false;

          this.inscripcionService.getMisInscripciones().subscribe({
            next: (list) => {
              this.inscripcionService.sincronizarInscripciones(list);
              this.loadIsRegistered();
            },
            error: () => {
              this.inscripcionService.desmarcarComoInscrito(Number(this.evento!.id));
            }
          });

          Swal.fire({
            icon: 'success',
            title: 'Inscripción cancelada',
            text: 'Ya no estás inscrito en este evento.',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.error ||
            'No se pudo cancelar la inscripción.';

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonText: 'Ok'
          });
        }
      });
    });
  }
}
