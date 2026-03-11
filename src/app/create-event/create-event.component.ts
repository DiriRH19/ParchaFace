import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements AfterViewInit, OnDestroy {

  currentStep = 1;
  totalSteps = 4;

  private map: L.Map | null = null;
  private locationMarker: L.Marker | null = null;

  private readonly defaultLat = 4.60971;
  private readonly defaultLng = -74.08175;
  private readonly defaultZoom = 12;

  selectedImageFile: File | null = null;

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
    direccionCompleta: '',
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
    sitioWeb: ''
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
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
      setTimeout(() => this.initLocationMap(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  addTag(): void {
    if (this.newTag.trim() && !this.eventData.tags.includes(this.newTag.trim())) {
      this.eventData.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.eventData.tags = this.eventData.tags.filter(t => t !== tag);
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;

      if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
        setTimeout(() => this.initLocationMap(), 0);
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepComplete(step: number): boolean {
    return step < this.currentStep;
  }

  onEventModeChange(): void {
    if (this.eventData.eventoEnLinea) {
      this.eventData.ubicacion = '';
      this.eventData.nombreLugar = '';
      this.eventData.direccionCompleta = '';
      this.eventData.ciudad = '';
      this.eventData.latitud = null;
      this.eventData.longitud = null;
      this.destroyMap();
    } else {
      setTimeout(() => this.initLocationMap(), 0);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedImageFile = file;
  }

  createEvent(): void {
    if (!this.validateAllSteps()) {
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
    this.appendIfNotEmpty(formData, 'direccionCompleta', this.eventData.direccionCompleta);
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

    if (this.selectedImageFile) {
      formData.append('imagenPortada', this.selectedImageFile);
    }

    this.eventoService.crearEvento(formData).subscribe({
      next: () => this.router.navigate(['/eventos']),
      error: err => console.error('Error creando evento', err)
    });
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateStepOne();
      case 2:
        return this.validateStepTwo();
      case 3:
        return this.validateStepThree();
      case 4:
        return this.validateStepFour();
      default:
        return true;
    }
  }

  private validateAllSteps(): boolean {
    return this.validateStepOne()
      && this.validateStepTwo()
      && this.validateStepThree()
      && this.validateStepFour();
  }

  private validateStepOne(): boolean {
    if (!this.eventData.titulo.trim()) {
      alert('Debes ingresar el título del evento.');
      return false;
    }

    return true;
  }

  private validateStepTwo(): boolean {
    if (!this.eventData.fecha) {
      alert('Debes seleccionar una fecha.');
      return false;
    }

    if (!this.eventData.horaInicio) {
      alert('Debes seleccionar la hora de inicio.');
      return false;
    }

    if (!this.eventData.horaFin) {
      alert('Debes seleccionar la hora de finalización.');
      return false;
    }

    if (this.eventData.eventoEnLinea) {
      if (!this.eventData.urlVirtual.trim()) {
        alert('Debes ingresar la URL del evento en línea.');
        return false;
      }
      return true;
    }

    if (!this.eventData.ubicacion.trim()) {
      alert('Debes ingresar la ubicación del evento.');
      return false;
    }

    if (this.eventData.latitud == null || this.eventData.longitud == null) {
      alert('Debes seleccionar la ubicación exacta en el mapa.');
      return false;
    }

    return true;
  }

  private validateStepThree(): boolean {
    if (!this.eventData.cupo || Number(this.eventData.cupo) <= 0) {
      alert('Debes ingresar un cupo válido.');
      return false;
    }

    if (!this.eventData.eventoGratuito && (!this.eventData.precio || Number(this.eventData.precio) <= 0)) {
      alert('Debes ingresar un precio válido.');
      return false;
    }

    return true;
  }

  private validateStepFour(): boolean {
    if (!this.eventData.eventoPublico && !this.eventData.detallePrivado.trim()) {
      alert('Debes indicar el detalle del evento privado.');
      return false;
    }

    return true;
  }

  private initLocationMap(): void {
    const mapContainer = document.getElementById('create-event-map');
    if (!mapContainer) {
      return;
    }

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

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setSelectedLocation(e.latlng.lat, e.latlng.lng);
    });

    if (this.eventData.latitud != null && this.eventData.longitud != null) {
      this.setSelectedLocation(this.eventData.latitud, this.eventData.longitud);
    } else {
      this.tryCenterOnUserLocation();
    }

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private setSelectedLocation(lat: number, lng: number): void {
    this.eventData.latitud = Number(lat.toFixed(6));
    this.eventData.longitud = Number(lng.toFixed(6));

    if (!this.eventData.ubicacion.trim()) {
      this.eventData.ubicacion = 'Ubicación seleccionada en mapa';
    }

    if (this.locationMarker) {
      this.locationMarker.setLatLng([lat, lng]);
    } else {
      this.locationMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);

      this.locationMarker.on('dragend', () => {
        const pos = this.locationMarker!.getLatLng();
        this.eventData.latitud = Number(pos.lat.toFixed(6));
        this.eventData.longitud = Number(pos.lng.toFixed(6));
      });
    }

    this.map?.setView([lat, lng], 15);
  }

  private tryCenterOnUserLocation(): void {
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

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.locationMarker = null;
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
}
