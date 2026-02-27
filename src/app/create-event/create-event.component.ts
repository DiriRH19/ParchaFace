import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements OnDestroy {

  currentStep = 1;
  showErrorModal: boolean = false;
  errorMessages: string[] = [];
  totalSteps = 4;

  // ✅ archivo real seleccionado (para multipart)
  private selectedCoverFile: File | null = null;

  // ✅ NUEVO: modal bonito de éxito
  showSuccessModal: boolean = false;
  createdEvent: any = null;

  // ✅ NUEVO: preview local (objectURL) para mostrar imagen en el modal (mejor que base64)
  localCoverPreviewUrl: string | null = null;

  eventData: any = {
    // Paso 1
    titulo: '',
    descripcion: '',
    categoria: '',
    tags: [] as string[], // (solo front) NO se envía
    imagenPortadaUrl: '', // (solo preview)
    imagenPortadaContentType: '',

    // Paso 2
    fecha: '',
    horaInicio: '',
    horaFin: '',
    eventoEnLinea: false,
    urlVirtual: '',
    ubicacion: '',
    nombreLugar: '',
    direccionCompleta: '',
    ciudad: '',

    // Paso 3
    cupo: 1,
    eventoGratuito: true,
    precio: null as number | null,
    emailContacto: '',
    telefonoContacto: '',
    sitioWeb: '',

    // Paso 4
    eventoPublico: true,
    detallePrivado: '',
    permitirComentarios: true,
    recordatoriosAutomaticos: false,

    // (solo front)
    collectFeedback: false
  };

  newTag = '';

  // Preview modal
  showPreview = false;

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

  ngOnDestroy(): void {
    if (this.localCoverPreviewUrl) {
      URL.revokeObjectURL(this.localCoverPreviewUrl);
      this.localCoverPreviewUrl = null;
    }
  }

  // =========================
  // TAGS (SOLO FRONT)
  // =========================
  addTag() {
    const t = (this.newTag || '').trim();
    if (t && !this.eventData.tags.includes(t)) {
      this.eventData.tags.push(t);
      this.newTag = '';
    }
  }

  removeTag(tag: string) {
    this.eventData.tags = this.eventData.tags.filter((t: string) => t !== tag);
  }

  // =========================
  // BORRADOR / VISTA PREVIA
  // =========================
  saveDraft() {
    try {
      const errors = this.validateCurrentStep();
      if (errors.length) {
        // Mantengo tu comportamiento actual (luego si quieres lo migramos a modal/toast)
        alert('Por favor completa los campos faltantes:\n' + errors.join('\n'));
        return;
      }

      const formData = this.buildFormData();

      this.eventoService.guardarBorrador(formData).subscribe({
        next: (evento) => {
          alert(`✓ Borrador guardado exitosamente (ID: ${evento.idEvento})`);
          console.log('Evento borrador guardado:', evento);
        },
        error: err => {
          console.error('Error guardando borrador:', err && err.message ? err.message : err);
          if (err && err.status === 401) {
            alert('❌ Debes estar autenticado para guardar un borrador.');
          } else if (err.status === 400) {
            alert('❌ Datos incompletos o inválidos. Revisa los campos obligatorios.');
          } else {
            alert('❌ No se pudo guardar el borrador en el servidor. Intenta nuevamente.');
          }
        }
      });
    } catch (err) {
      console.error('Error guardando borrador (sin enviar):', err && (err as any).message ? (err as any).message : err);
      alert('❌ Error inesperado al guardar el borrador.');
    }
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
    if (this.showPreview) window.scrollTo(0, 0);
  }

  // =========================
  // IMAGEN (archivo real + preview)
  // =========================
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Backend permite: jpg/jpeg/png/webp (según tu CrearEventoForm)
    const ct = (file.type || '').toLowerCase().trim();
    const ok =
      ct === 'image/jpeg' ||
      ct === 'image/jpg' ||
      ct === 'image/png' ||
      ct === 'image/webp';

    if (!ok) {
      alert('Formato no permitido. Solo JPG/JPEG/PNG/WEBP.');
      input.value = '';
      this.selectedCoverFile = null;
      this.eventData.imagenPortadaUrl = '';
      this.eventData.imagenPortadaContentType = '';

      if (this.localCoverPreviewUrl) {
        URL.revokeObjectURL(this.localCoverPreviewUrl);
        this.localCoverPreviewUrl = null;
      }
      return;
    }

    // ✅ Guardamos el File REAL para mandarlo por multipart
    this.selectedCoverFile = file;
    this.eventData.imagenPortadaContentType = ct;

    // ✅ Preview (base64) para tu vista previa existente (HTML usa imagenPortadaUrl)
    const reader = new FileReader();
    reader.onload = () => {
      this.eventData.imagenPortadaUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);

    // ✅ Preview local (objectURL) para el modal de éxito (más rápido y estable)
    if (this.localCoverPreviewUrl) {
      URL.revokeObjectURL(this.localCoverPreviewUrl);
    }
    this.localCoverPreviewUrl = URL.createObjectURL(file);
  }

  // =========================
  // STEPS
  // =========================
  nextStep() {
    const errors = this.validateCurrentStep();
    if (errors.length) {
      this.errorMessages = errors;
      this.showErrorModal = true;
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessages = [];
  }

  isStepComplete(step: number): boolean {
    return step < this.currentStep;
  }

  // =========================
  // HELPERS
  // =========================
  private normalizeTime(t: string): string {
    // input type="time" suele dar "HH:mm" -> lo volvemos "HH:mm:ss"
    if (!t) return t;
    return t.length === 5 ? `${t}:00` : t;
  }

  private appendIfNotEmpty(fd: FormData, key: string, value: any) {
    if (value === null || value === undefined) return;
    const s = String(value).trim();
    if (s === '') return;
    fd.append(key, s);
  }

  private toBooleanString(v: any): string {
    return v ? 'true' : 'false';
  }


  private resolveBackendImageUrl(url: string): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const backend = 'https://parchaface.eastus2.cloudapp.azure.com';
    return `${backend}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  // =========================
  // VALIDACIONES FRONT (suaves)
  // =========================
  private validateCurrentStep(): string[] {
    const e: string[] = [];

    if (this.currentStep === 1) {
      if (!this.eventData.titulo?.trim()) e.push('El título es obligatorio.');
      if (!this.eventData.descripcion?.trim()) e.push('La descripción es obligatoria.');
      if (!this.eventData.categoria?.trim()) e.push('La categoría es obligatoria.');
    }

    if (this.currentStep === 2) {
      if (!this.eventData.fecha) e.push('La fecha es obligatoria.');
      if (!this.eventData.horaInicio) e.push('La hora de inicio es obligatoria.');
      if (!this.eventData.horaFin) e.push('La hora de finalización es obligatoria.');

      // ✅ sin validar rango rígido (permite cruzar medianoche)
      const enLinea = Boolean(this.eventData.eventoEnLinea);

      if (enLinea) {
        if (!this.eventData.urlVirtual?.trim()) e.push('Si el evento es en línea, urlVirtual es obligatoria.');
      } else {
        if (!this.eventData.ubicacion?.trim()) e.push('Si el evento es presencial, la ubicación es obligatoria.');
      }
    }

    if (this.currentStep === 3) {
      const cupo = Number(this.eventData.cupo);
      if (!cupo || cupo < 1) e.push('El cupo debe ser mínimo 1.');

      if (!Boolean(this.eventData.eventoGratuito)) {
        const precio = Number(this.eventData.precio);
        if (!precio || precio <= 0) e.push('Si no es gratuito, el precio debe ser mayor a 0.');
      }
    }

    if (this.currentStep === 4) {
      if (!Boolean(this.eventData.eventoPublico)) {
        if (!this.eventData.detallePrivado?.trim()) e.push('Si no es público, detallePrivado es obligatorio.');
      }
    }

    return e;
  }

  // =========================
  // FORM DATA (backend CrearEventoForm + imagenPortada)
  // =========================
  private buildFormData(): FormData {
    const fd = new FormData();

    // ⚠️ claves deben coincidir con CrearEventoForm (exactas)
    this.appendIfNotEmpty(fd, 'titulo', this.eventData.titulo);
    this.appendIfNotEmpty(fd, 'descripcion', this.eventData.descripcion);
    this.appendIfNotEmpty(fd, 'categoria', this.eventData.categoria);

    // fecha y horas: como string
    this.appendIfNotEmpty(fd, 'fecha', this.eventData.fecha);
    this.appendIfNotEmpty(fd, 'horaInicio', this.normalizeTime(this.eventData.horaInicio));
    this.appendIfNotEmpty(fd, 'horaFin', this.normalizeTime(this.eventData.horaFin));

    // booleans (Spring los bindea si van como "true"/"false")
    fd.append('eventoEnLinea', this.toBooleanString(this.eventData.eventoEnLinea));
    fd.append('eventoGratuito', this.toBooleanString(this.eventData.eventoGratuito));
    fd.append('eventoPublico', this.toBooleanString(this.eventData.eventoPublico));
    fd.append('permitirComentarios', this.toBooleanString(this.eventData.permitirComentarios));
    fd.append('recordatoriosAutomaticos', this.toBooleanString(this.eventData.recordatoriosAutomaticos));

    // online/presencial condicional
    if (Boolean(this.eventData.eventoEnLinea)) {
      this.appendIfNotEmpty(fd, 'urlVirtual', this.eventData.urlVirtual);
    } else {
      this.appendIfNotEmpty(fd, 'ubicacion', this.eventData.ubicacion);
      this.appendIfNotEmpty(fd, 'nombreLugar', this.eventData.nombreLugar);
      this.appendIfNotEmpty(fd, 'direccionCompleta', this.eventData.direccionCompleta);
      this.appendIfNotEmpty(fd, 'ciudad', this.eventData.ciudad);
    }

    // cupo
    fd.append('cupo', String(Number(this.eventData.cupo)));

    // precio si no es gratuito
    if (!Boolean(this.eventData.eventoGratuito)) {
      // BigDecimal en backend -> mandar número como string
      this.appendIfNotEmpty(fd, 'precio', this.eventData.precio);
    }

    // contacto
    this.appendIfNotEmpty(fd, 'emailContacto', this.eventData.emailContacto);
    this.appendIfNotEmpty(fd, 'telefonoContacto', this.eventData.telefonoContacto);
    this.appendIfNotEmpty(fd, 'sitioWeb', this.eventData.sitioWeb);

    // detalle privado si no es público
    if (!Boolean(this.eventData.eventoPublico)) {
      this.appendIfNotEmpty(fd, 'detallePrivado', this.eventData.detallePrivado);
    }

    // ✅ archivo real: el nombre debe ser "imagenPortada"
    if (this.selectedCoverFile) {
      fd.append('imagenPortada', this.selectedCoverFile, this.selectedCoverFile.name);
    }

    return fd;
  }

  // =========================
  // ✅ MODAL ÉXITO: acciones
  // =========================
  onModifyFromModal() {
    // Cierra modal y deja al usuario editando (no pierde datos)
    this.showSuccessModal = false;
  }
  onAcceptFromModal() {
    this.showSuccessModal = false;

    // ✅ Ruta real del listado (tu ExploreComponent)
    this.router.navigate(['/explore'], {
      state: { newlyCreatedEvent: this.createdEvent }
    });
  }


  // =========================
  // CREAR EVENTO (multipart)
  // =========================
  createEvent() {
    const errors = this.validateCurrentStep();
    if (errors.length) {
      // Mantengo tu comportamiento para este caso (si quieres lo pasamos al error modal)
      alert(errors.join('\n'));
      return;
    }

    const formData = this.buildFormData();

    this.eventoService.crearEvento(formData).subscribe({
      next: (evento) => {
        // ✅ Guardamos respuesta para el modal
        this.createdEvent = {
          ...evento,
          // normaliza imagen si viene como ruta relativa
          imagenPortadaUrl: evento?.imagenPortadaUrl ? this.resolveBackendImageUrl(evento.imagenPortadaUrl) : evento?.imagenPortadaUrl
        };

        // ✅ cierra preview modal si estaba abierto
        if (this.showPreview) this.showPreview = false;

        // ✅ abre modal bonito
        this.showSuccessModal = true;
      },
      error: err => {
        console.error('Error creando evento:', err && err.message ? err.message : err);
        if (err && err.status === 401) {
          alert('❌ Debes estar autenticado para crear un evento.');
        } else if (err && err.status === 400) {
          alert('❌ Datos incompletos o inválidos. Revisa los campos obligatorios.');
        } else {
          alert('❌ No se pudo crear el evento. Revisa la consola para más detalles.');
        }
      }
    });
  }
}
