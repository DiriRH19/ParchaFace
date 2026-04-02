import {
  AfterViewInit,
  Component,
  OnDestroy,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';
import { ToastService } from '../shared/toast/toast.service';

interface RedSocialEvento {
  plataforma: string;
  url: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  currentStep = 1;
  totalSteps = 4;

  private leaflet?: typeof import('leaflet');
  private map?: import('leaflet').Map;
  private locationMarker?: import('leaflet').Marker;

  private readonly defaultLat = 4.60971;
  private readonly defaultLng = -74.08175;
  private readonly defaultZoom = 12;
  private readonly maxImagenes = 3;
  private readonly maxRedesSociales = 5;

  readonly plataformasSociales = [
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'X', label: 'X / Twitter' },
    { value: 'YOUTUBE', label: 'YouTube' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'TELEGRAM', label: 'Telegram' }
  ];

  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];

  isSubmitting = false;
  submitError = '';
  submitSuccess = '';
  validationErrors: string[] = [];

  eventData = {
    titulo: '',
    descripcion: '',
    categoria: '',
    tags: [] as string[],
    fecha: '',
    horaInicio: '',
    horaFin: '',
    eventoEnLinea: false,
    urlVirtual: '',
    ubicacion: '',
    nombreLugar: '',
    latitud: null as number | null,
    longitud: null as number | null,
    ciudad: '',
    cupo: '' as number | string,
    eventoGratuito: true,
    precio: '' as number | string,
    eventoPublico: true,
    detallePrivado: '',
    permitirComentarios: true,
    recordatoriosAutomaticos: true,
    emailContacto: '',
    telefonoContacto: '',
    sitioWeb: '',
    redesSociales: [] as RedSocialEvento[]
  };

  newTag = '';

  steps = [
    { id: 1, title: 'Información Básica', description: 'Título, descripción y categoría', icon: '' },
    { id: 2, title: 'Fecha y Lugar', description: 'Cuándo y dónde será tu evento', icon: '' },
    { id: 3, title: 'Detalles', description: 'Capacidad, precio y contacto', icon: '' },
    { id: 4, title: 'Configuración', description: 'Privacidad y configuraciones finales', icon: '' }
  ];

  constructor(
    private eventoService: EventoService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
      setTimeout(() => {
        this.initLocationMap();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.revokeAllPreviewUrls();
  }

  addTag(): void {
    const valor = this.newTag.trim();
    if (valor && !this.eventData.tags.includes(valor)) {
      this.eventData.tags.push(valor);
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.eventData.tags = this.eventData.tags.filter(t => t !== tag);
  }

  addRedSocial(): void {
    this.clearMessages();

    if (this.eventData.redesSociales.length >= this.maxRedesSociales) {
      this.submitError = `Puedes agregar máximo ${this.maxRedesSociales} redes sociales.`;
      return;
    }

    this.eventData.redesSociales.push({
      plataforma: '',
      url: ''
    });
  }

  removeRedSocial(index: number): void {
    if (index < 0 || index >= this.eventData.redesSociales.length) {
      return;
    }

    this.eventData.redesSociales.splice(index, 1);
  }

  nextStep(): void {
    this.clearMessages();

    const errors = this.getStepErrors(this.currentStep);
    if (errors.length > 0) {
      this.validationErrors = errors;
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;

      if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
        setTimeout(() => {
          this.initLocationMap();
        }, 0);
      }
    }
  }

  previousStep(): void {
    this.clearMessages();

    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepComplete(step: number): boolean {
    return step < this.currentStep;
  }

  onEventModeChange(): void {
    this.clearMessages();

    if (this.eventData.eventoEnLinea) {
      this.eventData.ubicacion = '';
      this.eventData.nombreLugar = '';
      this.eventData.ciudad = '';
      this.eventData.latitud = null;
      this.eventData.longitud = null;
      this.destroyMap();
    } else {
      setTimeout(() => {
        this.initLocationMap();
      }, 0);
    }
  }

  openFileSelector(input: HTMLInputElement): void {
    input.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];

    this.clearMessages();

    if (!files.length) {
      return;
    }

    for (const file of files) {
      if (!this.isValidImageFile(file)) {
        this.submitError = 'Todas las imágenes deben ser JPG, JPEG, PNG o WEBP.';
        input.value = '';
        return;
      }
    }

    const nuevas = files.filter(file => {
      return !this.selectedImages.some(existing =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
      );
    });

    const total = this.selectedImages.length + nuevas.length;

    if (total > this.maxImagenes) {
      this.submitError = `Solo puedes subir máximo ${this.maxImagenes} imágenes.`;
      input.value = '';
      return;
    }

    this.selectedImages = [...this.selectedImages, ...nuevas];

    this.revokeAllPreviewUrls();
    this.imagePreviewUrls = this.selectedImages.map(file => URL.createObjectURL(file));

    input.value = '';
  }

  removeSelectedImage(index: number, event?: Event): void {
    event?.stopPropagation();

    if (index < 0 || index >= this.selectedImages.length) {
      return;
    }

    this.selectedImages.splice(index, 1);

    this.revokeAllPreviewUrls();
    this.imagePreviewUrls = this.selectedImages.map(file => URL.createObjectURL(file));
  }

  createEvent(): void {
    this.clearMessages();

    const allErrors = this.getAllErrors();
    if (allErrors.length > 0) {
      this.validationErrors = allErrors;
      return;
    }

    const formData = new FormData();

    this.appendIfNotEmpty(formData, 'titulo', this.eventData.titulo);
    this.appendIfNotEmpty(formData, 'descripcion', this.eventData.descripcion);
    this.appendIfNotEmpty(formData, 'categoria', this.eventData.categoria);
    this.appendIfNotEmpty(formData, 'fecha', this.eventData.fecha);
    this.appendIfNotEmpty(formData, 'horaInicio', this.normalizeTime(this.eventData.horaInicio));
    this.appendIfNotEmpty(formData, 'horaFin', this.normalizeTime(this.eventData.horaFin));
    this.appendIfNotEmpty(formData, 'eventoEnLinea', this.eventData.eventoEnLinea);
    this.appendIfNotEmpty(formData, 'urlVirtual', this.eventData.urlVirtual);
    this.appendIfNotEmpty(formData, 'ubicacion', this.eventData.ubicacion);
    this.appendIfNotEmpty(formData, 'nombreLugar', this.eventData.nombreLugar);
    this.appendIfNotEmpty(formData, 'ciudad', this.eventData.ciudad);
    this.appendIfNotEmpty(formData, 'latitud', this.eventData.latitud);
    this.appendIfNotEmpty(formData, 'longitud', this.eventData.longitud);
    this.appendIfNotEmpty(formData, 'cupo', this.eventData.cupo);
    this.appendIfNotEmpty(formData, 'eventoGratuito', this.eventData.eventoGratuito);
    this.appendIfNotEmpty(formData, 'precio', this.eventData.eventoGratuito ? '' : this.eventData.precio);
    this.appendIfNotEmpty(formData, 'emailContacto', this.eventData.emailContacto);
    this.appendIfNotEmpty(formData, 'telefonoContacto', this.eventData.telefonoContacto);
    this.appendIfNotEmpty(formData, 'sitioWeb', this.eventData.sitioWeb);
    this.appendIfNotEmpty(formData, 'eventoPublico', this.eventData.eventoPublico);
    this.appendIfNotEmpty(formData, 'detallePrivado', this.eventData.eventoPublico ? '' : this.eventData.detallePrivado);
    this.appendIfNotEmpty(formData, 'permitirComentarios', this.eventData.permitirComentarios);
    this.appendIfNotEmpty(formData, 'recordatoriosAutomaticos', this.eventData.recordatoriosAutomaticos);

    this.selectedImages.forEach(file => {
      formData.append('imagenes', file);
    });

    this.eventData.redesSociales
      .filter(red => red.plataforma?.trim() && red.url?.trim())
      .forEach((red, index) => {
        formData.append(`redesSociales[${index}].plataforma`, red.plataforma.trim());
        formData.append(`redesSociales[${index}].url`, red.url.trim());
      });

    this.isSubmitting = true;

    this.eventoService.crearEvento(formData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;

        const mensaje = response?.mensaje || 'La solicitud de creación de evento fue enviada.';
        this.submitSuccess = mensaje;
        this.toast.show(mensaje, 'success', 3200);

        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 900);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Error creando evento', err);

        this.validationErrors = this.extractBackendErrors(err);

        if (this.validationErrors.length === 0) {
          const backendMessage =
            err?.error?.message ||
            err?.error?.error ||
            err?.error?.detalle ||
            err?.message;

          this.submitError = backendMessage || 'No se pudo crear el evento. Revisa los campos e inténtalo de nuevo.';
        }
      }
    });
  }

  private getStepErrors(step: number): string[] {
    switch (step) {
      case 1:
        return this.getStepOneErrors();
      case 2:
        return this.getStepTwoErrors();
      case 3:
        return this.getStepThreeErrors();
      case 4:
        return this.getStepFourErrors();
      default:
        return [];
    }
  }

  private getAllErrors(): string[] {
    return [
      ...this.getStepOneErrors(),
      ...this.getStepTwoErrors(),
      ...this.getStepThreeErrors(),
      ...this.getStepFourErrors()
    ];
  }

  private getStepOneErrors(): string[] {
    const errors: string[] = [];

    if (!this.eventData.titulo.trim()) {
      errors.push('Debes ingresar el título del evento.');
    }

    if (this.selectedImages.length < 1) {
      errors.push('Debes subir al menos una imagen.');
    }

    if (this.selectedImages.length > this.maxImagenes) {
      errors.push(`Solo puedes subir máximo ${this.maxImagenes} imágenes.`);
    }

    return errors;
  }

  private getStepTwoErrors(): string[] {
    const errors: string[] = [];

    if (!this.eventData.fecha) {
      errors.push('Debes seleccionar una fecha.');
    }

    if (!this.eventData.horaInicio) {
      errors.push('Debes seleccionar la hora de inicio.');
    }

    if (!this.eventData.horaFin) {
      errors.push('Debes seleccionar la hora de finalización.');
    }

    if (this.eventData.eventoEnLinea) {
      if (!this.eventData.urlVirtual.trim()) {
        errors.push('Debes ingresar la URL del evento en línea.');
      }
      return errors;
    }

    if (!this.eventData.ubicacion.trim()) {
      errors.push('Debes ingresar la ubicación del evento.');
    }

    if (this.eventData.latitud == null || this.eventData.longitud == null) {
      errors.push('Debes seleccionar la ubicación exacta en el mapa.');
    }

    return errors;
  }

  private getStepThreeErrors(): string[] {
    const errors: string[] = [];

    if (!this.eventData.cupo || Number(this.eventData.cupo) <= 0) {
      errors.push('Debes ingresar un cupo válido.');
    }

    if (!this.eventData.eventoGratuito && (!this.eventData.precio || Number(this.eventData.precio) <= 0)) {
      errors.push('Debes ingresar un precio válido.');
    }

    const plataformasUsadas = new Set<string>();

    this.eventData.redesSociales.forEach((red, index) => {
      const fila = index + 1;

      const tienePlataforma = !!red.plataforma?.trim();
      const tieneUrl = !!red.url?.trim();

      if (tienePlataforma && !tieneUrl) {
        errors.push(`Debes ingresar la URL en la red social #${fila}.`);
      }

      if (!tienePlataforma && tieneUrl) {
        errors.push(`Debes seleccionar la plataforma en la red social #${fila}.`);
      }

      if (tieneUrl && !this.isValidUrl(red.url)) {
        errors.push(`La URL de la red social #${fila} no es válida. Debe iniciar con http:// o https://`);
      }

      if (tienePlataforma) {
        const plataformaNormalizada = red.plataforma.trim().toUpperCase();

        if (plataformasUsadas.has(plataformaNormalizada)) {
          errors.push(`No puedes repetir la plataforma ${red.plataforma}.`);
        }

        plataformasUsadas.add(plataformaNormalizada);
      }
    });

    return errors;
  }

  private getStepFourErrors(): string[] {
    const errors: string[] = [];

    if (!this.eventData.eventoPublico && !this.eventData.detallePrivado.trim()) {
      errors.push('Debes indicar el detalle del evento privado.');
    }

    return errors;
  }

  private extractBackendErrors(err: any): string[] {
    const out: string[] = [];
    const body = err?.error;

    if (Array.isArray(body?.errors)) {
      return body.errors.map((e: any) => String(e));
    }

    if (body?.errors && typeof body.errors === 'object') {
      Object.values(body.errors).forEach((val: any) => {
        if (Array.isArray(val)) {
          val.forEach(v => out.push(String(v)));
        } else {
          out.push(String(val));
        }
      });
      return out;
    }

    if (body?.message) {
      out.push(String(body.message));
      return out;
    }

    return out;
  }

  private clearMessages(): void {
    this.submitError = '';
    this.submitSuccess = '';
    this.validationErrors = [];
  }

  private isValidUrl(value: string): boolean {
    if (!value || !value.trim()) {
      return false;
    }

    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async initLocationMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const mapContainer = document.getElementById('create-event-map');
    if (!mapContainer) {
      return;
    }

    const L = await this.getLeaflet();

    this.destroyMap();

    const initialLat = this.eventData.latitud ?? this.defaultLat;
    const initialLng = this.eventData.longitud ?? this.defaultLng;
    const initialZoom =
      this.eventData.latitud != null && this.eventData.longitud != null
        ? 15
        : this.defaultZoom;

    this.map = L.map('create-event-map').setView([initialLat, initialLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
      this.setSelectedLocation(e.latlng.lat, e.latlng.lng);
    });

    if (this.eventData.latitud != null && this.eventData.longitud != null) {
      await this.setSelectedLocation(this.eventData.latitud, this.eventData.longitud);
    } else {
      this.tryCenterOnUserLocation();
    }

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private async setSelectedLocation(lat: number, lng: number): Promise<void> {
    if (!this.map) return;

    const L = await this.getLeaflet();

    this.eventData.latitud = Number(lat.toFixed(6));
    this.eventData.longitud = Number(lng.toFixed(6));

    if (!this.eventData.ubicacion.trim()) {
      this.eventData.ubicacion = 'Ubicación seleccionada en mapa';
    }

    if (this.locationMarker) {
      this.locationMarker.setLatLng([lat, lng]);
    } else {
      this.locationMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

      this.locationMarker.on('dragend', () => {
        const pos = this.locationMarker!.getLatLng();
        this.eventData.latitud = Number(pos.lat.toFixed(6));
        this.eventData.longitud = Number(pos.lng.toFixed(6));
      });
    }

    this.map.setView([lat, lng], 15);
  }

  private tryCenterOnUserLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!navigator.geolocation || !this.map) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.map?.setView([lat, lng], 13);
      },
      () => {
        this.map?.setView([this.defaultLat, this.defaultLng], this.defaultZoom);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000
      }
    );
  }

  private async getLeaflet(): Promise<typeof import('leaflet')> {
    if (this.leaflet) return this.leaflet;

    const L = await import('leaflet');

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    this.leaflet = L;
    return L;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.locationMarker = undefined;
  }

  private appendIfNotEmpty(fd: FormData, key: string, value: any): void {
    if (value !== null && value !== undefined && value !== '') {
      fd.append(key, String(value));
    }
  }

  private normalizeTime(value: string): string {
    if (!value) {
      return value;
    }

    return value.length === 5 ? `${value}:00` : value;
  }

  private isValidImageFile(file: File): boolean {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return allowed.includes((file.type || '').toLowerCase());
  }

  private revokeAllPreviewUrls(): void {
    this.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    this.imagePreviewUrls = [];
  }
}