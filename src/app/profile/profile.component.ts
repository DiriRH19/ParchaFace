import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, UserData } from '../services/auth.service';

type SocialLink = { platform: string; handle: string };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  activeTab = 'profile';
  userData: UserData | null = null;

  tabs = [
    { id: 'profile', label: 'Perfil' },
    { id: 'events', label: 'Eventos' },
    { id: 'activity', label: 'Actividad' },
    { id: 'settings', label: 'Configuración' }
  ];

  selectedPerfil: File | null = null;
  selectedPortada: File | null = null;

  // ✅ Estado de edición
  isEditing = false;
  isSaving = false;
  showDiscardModal = false;
  saveError = '';

  // ✅ Form de edición (ahora incluye acercaDe y redesSociales)
  editForm: { nombre: string; correo: string; acercaDe: string; redesSociales: SocialLink[] } = {
    nombre: '',
    correo: '',
    acercaDe: '',
    redesSociales: []
  };

  private originalForm: { nombre: string; correo: string; acercaDe: string; redesSociales: SocialLink[] } = {
    nombre: '',
    correo: '',
    acercaDe: '',
    redesSociales: []
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // 1) datos básicos desde el token
    this.userData = this.authService.getUserData();

    // 2) escuchar cambios del AuthService
    this.authService.userData$.subscribe(userData => {
      this.userData = userData;

      // 3) cuando ya haya id, traer datos completos (incluye fotoPerfil/fotoPortada + extras)
      if (this.userData?.id) {
        this.authService.getUsuarioById(this.userData.id).subscribe(u => {
          this.userData = { ...this.userData, ...u };

          // Si NO está en edición, sincroniza el form con datos actuales
          if (!this.isEditing) this.syncFormFromUser();
        });
      }
    });

    // En caso de que ya exista id desde el arranque:
    if (this.userData?.id) {
      this.authService.getUsuarioById(this.userData.id).subscribe(u => {
        this.userData = { ...this.userData, ...u };
        if (!this.isEditing) this.syncFormFromUser();
      });
    } else {
      this.syncFormFromUser();
    }
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  // -----------------------------
  // ✅ Modo edición: Editar / Guardar / Cancelar
  // -----------------------------

  startEdit(): void {
    if (!this.userData) return;

    this.saveError = '';
    this.isEditing = true;
    this.isSaving = false;
    this.showDiscardModal = false;

    const redes = Array.isArray((this.userData as any)?.redesSociales)
      ? (this.userData as any).redesSociales
      : [];

    this.editForm = {
      nombre: (this.userData.nombre || this.userData.usuario || this.getFallbackName() || '').toString(),
      correo: (this.userData.correo || '').toString(),
      acercaDe: ((this.userData as any).acercaDe || '').toString(),
      redesSociales: redes.map((r: any) => ({
        platform: (r?.platform || '').toString(),
        handle: (r?.handle || '').toString()
      }))
    };

    // snapshot para descartar
    this.originalForm = {
      ...this.editForm,
      redesSociales: this.editForm.redesSociales.map(x => ({ ...x }))
    };
  }

  cancelEdit(): void {
    if (!this.isEditing) return;

    this.saveError = '';

    // Si no hay cambios, salir sin modal
    if (!this.hasUnsavedChanges()) {
      this.isEditing = false;
      return;
    }

    // Si hay cambios, mostrar modal
    this.showDiscardModal = true;
  }

  closeDiscardModal(): void {
    this.showDiscardModal = false;
  }

  discardChanges(): void {
    // Restaurar snapshot
    this.editForm = {
      ...this.originalForm,
      redesSociales: this.originalForm.redesSociales.map(x => ({ ...x }))
    };
    this.showDiscardModal = false;
    this.isEditing = false;
    this.saveError = '';
  }

  saveProfile(): void {
    if (!this.userData?.id) return;

    const nombre = this.normalize(this.editForm.nombre);
    const correo = this.normalize(this.editForm.correo);
    const acercaDe = (this.editForm.acercaDe ?? '').toString().trim();

    // redes: limpia vacíos
    const redesSociales = (this.editForm.redesSociales || [])
      .map(r => ({
        platform: (r.platform || '').trim(),
        handle: (r.handle || '').trim()
      }))
      .filter(r => r.platform || r.handle);

    if (!nombre) {
      this.saveError = 'El nombre no puede estar vacío.';
      return;
    }
    if (!correo) {
      this.saveError = 'El correo no puede estar vacío.';
      return;
    }

    // Si no cambió nada, salir sin pegarle al backend
    if (!this.hasUnsavedChanges()) {
      this.isEditing = false;
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    this.authService.updateUsuario(this.userData.id, { nombre, correo, acercaDe, redesSociales }).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };

        this.isSaving = false;
        this.isEditing = false;
        this.showDiscardModal = false;

        this.syncFormFromUser();
      },
      error: (err) => {
        const msg = err?.error || err?.message || 'No se pudo guardar los cambios.';
        this.saveError = typeof msg === 'string' ? msg : 'No se pudo guardar los cambios.';
        this.isSaving = false;
      }
    });
  }

  private hasUnsavedChanges(): boolean {
    const aNombre = this.normalize(this.editForm.nombre);
    const aCorreo = this.normalize(this.editForm.correo);
    const aAcerca = (this.editForm.acercaDe ?? '').toString().trim();
    const aRedes = this.normalizeRedes(this.editForm.redesSociales);

    const bNombre = this.normalize(this.originalForm.nombre);
    const bCorreo = this.normalize(this.originalForm.correo);
    const bAcerca = (this.originalForm.acercaDe ?? '').toString().trim();
    const bRedes = this.normalizeRedes(this.originalForm.redesSociales);

    return aNombre !== bNombre || aCorreo !== bCorreo || aAcerca !== bAcerca || aRedes !== bRedes;
  }

  private normalizeRedes(redes: SocialLink[]): string {
    const arr = (redes || [])
      .map(r => ({
        platform: (r.platform || '').trim().toLowerCase(),
        handle: (r.handle || '').trim()
      }))
      .filter(r => r.platform || r.handle);
    return JSON.stringify(arr);
  }

  private syncFormFromUser(): void {
    const nombre = (this.userData?.nombre || this.userData?.usuario || this.getFallbackName() || '').toString();
    const correo = (this.userData?.correo || '').toString();
    const acercaDe = ((this.userData as any)?.acercaDe || '').toString();

    const redes = Array.isArray((this.userData as any)?.redesSociales)
      ? (this.userData as any).redesSociales
      : [];

    this.editForm = {
      nombre,
      correo,
      acercaDe,
      redesSociales: redes.map((r: any) => ({
        platform: (r?.platform || '').toString(),
        handle: (r?.handle || '').toString()
      }))
    };

    this.originalForm = {
      ...this.editForm,
      redesSociales: this.editForm.redesSociales.map(x => ({ ...x }))
    };
  }

  private normalize(v: any): string {
    return (v ?? '').toString().trim();
  }

  // -----------------------------
  // ✅ Redes sociales (agregar/quitar)
  // -----------------------------

  trackByIndex(i: number) { return i; }

  addSocial(): void {
    this.editForm.redesSociales = [...this.editForm.redesSociales, { platform: '', handle: '' }];
  }

  removeSocial(index: number): void {
    this.editForm.redesSociales = this.editForm.redesSociales.filter((_, i) => i !== index);
  }

  // -----------------------------
  // ✅ Fotos (lo que ya tenías)
  // -----------------------------

  onPerfilSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.selectedPerfil = file;
    this.subirFotoPerfil();
  }

  onPortadaSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.selectedPortada = file;
    this.subirFotoPortada();
  }

  subirFotoPerfil() {
    if (!this.selectedPerfil || !this.userData?.id) return;

    const formData = new FormData();
    formData.append('file', this.selectedPerfil);

    this.authService.uploadPerfil(this.userData.id, formData).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };
      },
      error: (err) => console.error('Error subiendo foto perfil:', err.status, err)
    });
  }

  subirFotoPortada() {
    if (!this.selectedPortada || !this.userData?.id) return;

    const formData = new FormData();
    formData.append('file', this.selectedPortada);

    this.authService.uploadPortada(this.userData.id, formData).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };
      },
      error: (err) => console.error('Error subiendo foto portada:', err.status, err)
    });
  }

  // -----------------------------
  // ✅ Helpers
  // -----------------------------

  getUserName(): string {
    return this.userData?.nombre || this.userData?.usuario || this.getFallbackName() || 'Usuario';
  }

  getDisplayHandle(): string {
    return this.userData?.nombre || this.userData?.usuario || this.getFallbackName() || 'usuario';
  }

  getUserEmail(): string {
    return this.userData?.correo || '';
  }

  private getFallbackName(): string {
    const correo = this.userData?.correo;
    if (typeof correo === 'string' && correo.includes('@')) {
      return correo.split('@')[0];
    }
    return '';
  }
}