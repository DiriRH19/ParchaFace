import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { API_CONFIG, buildApiUrl, buildMediaUrl } from '../config/api.config';

import { AuthService, UserData } from '../services/auth.service';
import {
  ProfileDataService,
  ProfileActivityItem,
  ProfileEventItem
} from '../services/profile-data.service';
import { ParchaSwal } from '../shared/swal/parcha-swal';
import {
  UsuariosService,
  PerfilUsuarioDto,
  UsuarioResumenDto,
  UsuarioBusquedaDto
} from '../services/usuarios.service';

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

  createdEvents: ProfileEventItem[] = [];
  joinedEvents: ProfileEventItem[] = [];
  activityItems: ProfileActivityItem[] = [];

  loadingEvents = false;
  loadingActivity = false;

  eventsError = '';
  activityError = '';

  private eventsLoaded = false;
  private activityLoaded = false;

  tabs = [
    { id: 'profile', label: 'Perfil' },
    { id: 'events', label: 'Eventos' },
    { id: 'activity', label: 'Actividad' },
    { id: 'settings', label: 'Configuración' }
  ];

  selectedPerfil: File | null = null;
  selectedPortada: File | null = null;

  isDeletingProfilePhoto = false;

  perfilPreviewUrl = '';
  portadaPreviewUrl = '';

  isEditing = false;
  isSaving = false;
  showDiscardModal = false;
  saveError = '';

  isDeletingAccount = false;
  deleteAccountError = '';

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

  perfilPublico: PerfilUsuarioDto | null = null;
  totalSeguidores = 0;
  totalSiguiendo = 0;

  showFollowModal = false;
  followModalTitle = '';
  followModalUsers: UsuarioResumenDto[] = [];
  followModalLoading = false;
  followModalError = '';

  searchQuery = '';
  searchLoading = false;
  searchError = '';
  searchResults: UsuarioBusquedaDto[] = [];
  searchTouched = false;

  constructor(
    private authService: AuthService,
    private profileDataService: ProfileDataService,
    private usuariosService: UsuariosService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.getUserData();
    this.syncFormFromUser();
    this.refreshCurrentUserData();

    this.authService.userData$.subscribe(userData => {
      this.userData = userData;
      if (!this.isEditing) {
        this.syncFormFromUser();
      }
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;

    if (tabId === 'events') {
      this.loadEventsTab();
    }

    if (tabId === 'activity') {
      this.loadActivityTab();
    }
  }

  get profileImageSrc(): string {
    return this.perfilPreviewUrl || this.getMediaUrl(
      this.userData?.fotoPerfil ||
      this.userData?.fotoPerfilUrl
    );
  }

  get coverImageSrc(): string {
    return this.portadaPreviewUrl || this.getMediaUrl(
      this.userData?.fotoPortada ||
      this.userData?.fotoPortadaUrl
    );
  }

  get topInterests(): string[] {
    return (this.userData?.categoriasPreferidas || []).slice(0, 6);
  }

  get remainingInterestsCount(): number {
    const total = this.userData?.categoriasPreferidas?.length || 0;
    return total > 6 ? total - 6 : 0;
  }

  get hasInterests(): boolean {
    return (this.userData?.categoriasPreferidas?.length || 0) > 0;
  }

  loadSocialStats(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.usuariosService.obtenerPerfil(userId).subscribe({
      next: (perfil) => {
        this.perfilPublico = perfil;
        this.totalSeguidores = perfil.totalSeguidores ?? 0;
        this.totalSiguiendo = perfil.totalSiguiendo ?? 0;
      },
      error: (err) => {
        console.error('Error cargando estadísticas sociales:', err);
      }
    });
  }

  getTotalEventosPerfil(): number {
    return (this.createdEvents?.length || 0) + (this.joinedEvents?.length || 0);
  }

  openSeguidoresModal(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.showFollowModal = true;
    this.followModalTitle = 'Seguidores';
    this.followModalUsers = [];
    this.followModalError = '';
    this.followModalLoading = true;

    this.usuariosService.obtenerSeguidores(userId).subscribe({
      next: (users) => {
        this.followModalUsers = users ?? [];
        this.followModalLoading = false;
      },
      error: (err) => {
        console.error('Error cargando seguidores:', err);
        this.followModalError = 'No se pudieron cargar los seguidores.';
        this.followModalLoading = false;
      }
    });
  }

  openSiguiendoModal(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.showFollowModal = true;
    this.followModalTitle = 'Siguiendo';
    this.followModalUsers = [];
    this.followModalError = '';
    this.followModalLoading = true;

    this.usuariosService.obtenerSiguiendo(userId).subscribe({
      next: (users) => {
        this.followModalUsers = users ?? [];
        this.followModalLoading = false;
      },
      error: (err) => {
        console.error('Error cargando seguidos:', err);
        this.followModalError = 'No se pudieron cargar los usuarios seguidos.';
        this.followModalLoading = false;
      }
    });
  }

  closeFollowModal(): void {
    this.showFollowModal = false;
    this.followModalTitle = '';
    this.followModalUsers = [];
    this.followModalLoading = false;
    this.followModalError = '';
  }

  buscarPerfiles(): void {
    const q = this.searchQuery.trim();

    this.searchTouched = true;
    this.searchError = '';

    if (!q) {
      this.searchResults = [];
      this.searchLoading = false;
      return;
    }

    this.searchLoading = true;

    this.usuariosService.buscarUsuarios(q).subscribe({
      next: (results) => {
        this.searchResults = results ?? [];
        this.searchLoading = false;
      },
      error: (err) => {
        console.error('Error buscando usuarios:', err);
        this.searchError = 'No se pudieron buscar perfiles.';
        this.searchLoading = false;
      }
    });
  }

  clearBusqueda(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.searchError = '';
    this.searchLoading = false;
    this.searchTouched = false;
  }

  getSearchUserImage(path?: string | null): string {
    return this.getMediaUrl(path);
  }

  getEventImage(path?: string | null): string {
    return this.getMediaUrl(path);
  }

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
      acercaDe: ((this.userData as any)?.acercaDe || '').toString(),
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

  cancelEdit(): void {
    if (!this.isEditing) return;

    this.saveError = '';

    if (!this.hasUnsavedChanges()) {
      this.isEditing = false;
      return;
    }

    this.showDiscardModal = true;
  }

  closeDiscardModal(): void {
    this.showDiscardModal = false;
  }

  discardChanges(): void {
    this.editForm = {
      ...this.originalForm,
      redesSociales: this.originalForm.redesSociales.map(x => ({ ...x }))
    };
    this.showDiscardModal = false;
    this.isEditing = false;
    this.saveError = '';
  }

  saveProfile(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const nombre = this.normalize(this.editForm.nombre);
    const correo = this.normalize(this.editForm.correo);
    const acercaDe = (this.editForm.acercaDe ?? '').toString().trim();

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

    if (!this.hasUnsavedChanges()) {
      this.isEditing = false;
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    this.authService.updateUsuario(userId, { nombre, correo, acercaDe, redesSociales }).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };
        this.isSaving = false;
        this.isEditing = false;
        this.showDiscardModal = false;

        this.syncFormFromUser();
        this.loadSocialStats();
      },
      error: (err) => {
        const msg = err?.error || err?.message || 'No se pudo guardar los cambios.';
        this.saveError = typeof msg === 'string' ? msg : 'No se pudo guardar los cambios.';
        this.isSaving = false;
      }
    });
  }

  eliminarCuenta(): void {
    if (this.isDeletingAccount) return;

    ParchaSwal.fire({
      icon: 'warning',
      title: '¿Eliminar cuenta?',
      text: 'Esta acción marcará tu cuenta como cancelada y cerrará tu sesión.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.isDeletingAccount = true;
      this.deleteAccountError = '';

      const token = this.authService.getToken();
      let headers = new HttpHeaders();

      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }

      this.http.delete<{ message: string }>(
        buildApiUrl(`${API_CONFIG.endpoints.usuarios.base}/mi-cuenta`),
        { headers }
      ).subscribe({
        next: () => {
          this.isDeletingAccount = false;

          ParchaSwal.fire({
            icon: 'success',
            title: 'Cuenta eliminada',
            text: 'Tu cuenta fue eliminada correctamente.',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.authService.logout();
          });
        },
        error: (err) => {
          console.error('Error eliminando cuenta:', err);
          this.deleteAccountError = 'No se pudo eliminar la cuenta.';
          this.isDeletingAccount = false;

          ParchaSwal.fire({
            icon: 'error',
            title: 'No se pudo eliminar',
            text: this.deleteAccountError,
            confirmButtonText: 'Ok'
          });
        }
      });
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

  trackByIndex(i: number): number {
    return i;
  }

  addSocial(): void {
    this.editForm.redesSociales = [
      ...this.editForm.redesSociales,
      { platform: '', handle: '' }
    ];
  }

  removeSocial(index: number): void {
    this.editForm.redesSociales = this.editForm.redesSociales.filter((_, i) => i !== index);
  }


  onPerfilSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.selectedPerfil = file;
    this.setPreview(file, 'perfil');
    this.saveError = '';

    this.authService.uploadPerfil(userId, this.buildSingleFileFormData(file)).subscribe({
      next: (u: any) => {
        const foto = u?.fotoPerfilUrl || u?.fotoPerfil || '';

        this.userData = {
          ...(this.userData || {}),
          ...(u || {}),
          fotoPerfil: foto,
          fotoPerfilUrl: foto
        };

        this.selectedPerfil = null;
        this.perfilPreviewUrl = '';
      },
      error: (err) => {
        console.error('Error subiendo foto perfil:', err);
        this.saveError = 'No se pudo subir la foto de perfil.';
        this.selectedPerfil = null;
        this.perfilPreviewUrl = '';
      }
    });
  }

  hasStoredProfilePhoto(): boolean {
    return !!(this.userData?.fotoPerfil || this.userData?.fotoPerfilUrl);
  }

  removeProfilePhoto(): void {
    const userId = this.getCurrentUserId();
    if (!userId || this.isDeletingProfilePhoto || !this.hasStoredProfilePhoto()) {
      return;
    }

    const confirmed = window.confirm('¿Seguro que quieres eliminar tu foto de perfil?');
    if (!confirmed) {
      return;
    }

    this.isDeletingProfilePhoto = true;

    this.authService.deletePerfilPhoto(userId).subscribe({
      next: (u: any) => {
        this.userData = {
          ...this.userData,
          ...u,
          fotoPerfil: null,
          fotoPerfilUrl: null,
          fotoPerfilPublicId: null
        };

        this.selectedPerfil = null;
        this.perfilPreviewUrl = '';
        this.isDeletingProfilePhoto = false;

        this.refreshCurrentUserData();
      },
      error: (err) => {
        console.error('Error eliminando foto perfil:', err);
        this.isDeletingProfilePhoto = false;
      }
    });
  }



  onPortadaSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.selectedPortada = file;
    this.setPreview(file, 'portada');
    this.saveError = '';

    this.authService.uploadPortada(userId, this.buildSingleFileFormData(file)).subscribe({
      next: (u: any) => {
        const foto = u?.fotoPortadaUrl || u?.fotoPortada || '';

        this.userData = {
          ...(this.userData || {}),
          ...(u || {}),
          fotoPortada: foto,
          fotoPortadaUrl: foto
        };

        this.selectedPortada = null;
        this.portadaPreviewUrl = '';
      },
      error: (err) => {
        console.error('Error subiendo foto portada:', err);
        this.saveError = 'No se pudo subir la foto de portada.';
        this.selectedPortada = null;
        this.portadaPreviewUrl = '';
      }
    });
  }

  private buildSingleFileFormData(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  }

  private setPreview(file: File, target: 'perfil' | 'portada'): void {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (target === 'perfil') {
        this.perfilPreviewUrl = result;
      } else {
        this.portadaPreviewUrl = result;
      }
    };
    reader.readAsDataURL(file);
  }

  getUserName(): string {
    return this.userData?.nombre || this.userData?.usuario || this.getFallbackName() || 'Usuario';
  }

  getDisplayHandle(): string {
    const value = this.userData?.usuario || this.getFallbackName() || 'usuario';
    return value.startsWith('@') ? value : `@${value}`;
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

  private getCurrentUserId(): number | null {
    const rawId = this.userData?.id ?? this.userData?.idUsuario;
    const id = Number(rawId);
    return Number.isNaN(id) || id <= 0 ? null : id;
  }

  private refreshCurrentUserData(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.authService.getUsuarioById(userId).subscribe({
      next: (u) => {
        this.userData = { ...(this.userData || {}), ...(u || {}) };

        if (!this.isEditing) {
          this.syncFormFromUser();
        }

        this.loadSocialStats();
      },
      error: (err) => {
        console.error('Error cargando perfil:', err);
      }
    });
  }

  private getMediaUrl(path?: string | null): string {
    return buildMediaUrl(path);
  }

  private loadEventsTab(): void {
    if (this.eventsLoaded || this.loadingEvents) return;

    this.loadingEvents = true;
    this.eventsError = '';

    forkJoin({
      created: this.profileDataService.getMisEventosCreados(),
      joined: this.profileDataService.getMisEventosInscritos()
    }).subscribe({
      next: ({ created, joined }) => {
        this.createdEvents = created ?? [];
        this.joinedEvents = joined ?? [];
        this.eventsLoaded = true;
        this.loadingEvents = false;
      },
      error: (err) => {
        console.error('Error cargando pestaña de eventos:', err);
        this.eventsError = 'No se pudieron cargar tus eventos.';
        this.loadingEvents = false;
      }
    });
  }

  private loadActivityTab(): void {
    if (this.activityLoaded || this.loadingActivity) return;

    this.loadingActivity = true;
    this.activityError = '';

    this.profileDataService.getMiActividad().subscribe({
      next: (items) => {
        this.activityItems = items ?? [];
        this.activityLoaded = true;
        this.loadingActivity = false;
      },
      error: (err) => {
        console.error('Error cargando actividad:', err);
        this.activityError = 'No se pudo cargar tu actividad.';
        this.loadingActivity = false;
      }
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  getActivityBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'EVENTO_CREADO':
        return 'badge-created';
      case 'INSCRIPCION_EVENTO':
        return 'badge-joined';
      case 'POST_COMUNIDAD':
        return 'badge-post';
      case 'COMENTARIO_COMUNIDAD':
      case 'COMENTARIO_EVENTO':
        return 'badge-comment';
      case 'NOTIFICACION':
        return 'badge-notification';
      default:
        return 'badge-default';
    }
  }

  getEstadoEventoLabel(estado?: string | null): string {
    if (!estado?.trim()) {
      return 'sin_estado';
    }

    return estado.trim().toLowerCase();
  }

  getEstadoEventoBadgeClass(estado?: string | null): string {
    const normalized = (estado || '').trim().toLowerCase();

    switch (normalized) {
      case 'activo':
        return 'badge-status-activo';
      case 'pendiente_aprobacion':
        return 'badge-status-pendiente';
      case 'rechazado':
        return 'badge-status-rechazado';
      case 'borrador':
        return 'badge-status-borrador';
      case 'cancelado':
        return 'badge-status-cancelado';
      default:
        return 'badge-status-default';
    }
  }
}
