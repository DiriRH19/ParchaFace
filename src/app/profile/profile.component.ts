import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService, UserData } from '../services/auth.service';
import {
  ProfileDataService,
  ProfileActivityItem,
  ProfileEventItem
} from '../services/profile-data.service';
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

  isEditing = false;
  isSaving = false;
  showDiscardModal = false;
  saveError = '';

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

  // =========================
  // Búsqueda de perfiles
  // =========================
  searchQuery = '';
  searchLoading = false;
  searchError = '';
  searchResults: UsuarioBusquedaDto[] = [];
  searchTouched = false;

  constructor(
    private authService: AuthService,
    private profileDataService: ProfileDataService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.getUserData();

    this.authService.userData$.subscribe(userData => {
      this.userData = userData;

      if (this.userData?.id) {
        this.authService.getUsuarioById(this.userData.id).subscribe(u => {
          this.userData = { ...this.userData, ...u };

          if (!this.isEditing) {
            this.syncFormFromUser();
          }

          this.loadSocialStats();
        });
      } else {
        this.syncFormFromUser();
      }
    });

    if (this.userData?.id) {
      this.authService.getUsuarioById(this.userData.id).subscribe(u => {
        this.userData = { ...this.userData, ...u };

        if (!this.isEditing) {
          this.syncFormFromUser();
        }

        this.loadSocialStats();
      });
    } else {
      this.syncFormFromUser();
    }
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

  loadSocialStats(): void {
    if (!this.userData?.id) return;

    this.usuariosService.obtenerPerfil(this.userData.id).subscribe({
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
    if (!this.userData?.id) return;

    this.showFollowModal = true;
    this.followModalTitle = 'Seguidores';
    this.followModalUsers = [];
    this.followModalError = '';
    this.followModalLoading = true;

    this.usuariosService.obtenerSeguidores(this.userData.id).subscribe({
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
    if (!this.userData?.id) return;

    this.showFollowModal = true;
    this.followModalTitle = 'Siguiendo';
    this.followModalUsers = [];
    this.followModalError = '';
    this.followModalLoading = true;

    this.usuariosService.obtenerSiguiendo(this.userData.id).subscribe({
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
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `http://localhost:8080${path}`;
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
    if (!this.userData?.id) return;

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

    this.authService.updateUsuario(this.userData.id, { nombre, correo, acercaDe, redesSociales }).subscribe({
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
    this.selectedPerfil = file;
    this.subirFotoPerfil();
  }

  onPortadaSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.selectedPortada = file;
    this.subirFotoPortada();
  }

  subirFotoPerfil(): void {
    if (!this.selectedPerfil || !this.userData?.id) return;

    const formData = new FormData();
    formData.append('file', this.selectedPerfil);

    this.authService.uploadPerfil(this.userData.id, formData).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };
        this.loadSocialStats();
      },
      error: (err) => console.error('Error subiendo foto perfil:', err.status, err)
    });
  }

  subirFotoPortada(): void {
    if (!this.selectedPortada || !this.userData?.id) return;

    const formData = new FormData();
    formData.append('file', this.selectedPortada);

    this.authService.uploadPortada(this.userData.id, formData).subscribe({
      next: (u: any) => {
        this.userData = { ...this.userData, ...u };
        this.loadSocialStats();
      },
      error: (err) => console.error('Error subiendo foto portada:', err.status, err)
    });
  }

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
}
