import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UsuariosService, PerfilUsuarioDto, UsuarioResumenDto } from '../services/usuarios.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  activeTab: 'profile' | 'followers' | 'following' = 'profile';

  perfil: PerfilUsuarioDto | null = null;
  seguidores: UsuarioResumenDto[] = [];
  siguiendo: UsuarioResumenDto[] = [];

  loading = false;
  actionLoading = false;
  loadingFollowers = false;
  loadingFollowing = false;

  error = '';
  followersError = '';
  followingError = '';

  private followersLoaded = false;
  private followingLoaded = false;

  tabs: Array<{ id: 'profile' | 'followers' | 'following'; label: string }> = [
    { id: 'profile', label: 'Perfil' },
    { id: 'followers', label: 'Seguidores' },
    { id: 'following', label: 'Siguiendo' }
  ];

  constructor(
    private route: ActivatedRoute,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      if (!id || isNaN(id)) {
        this.error = 'Usuario inválido.';
        return;
      }

      this.resetState();
      this.cargarPerfil(id);
    });
  }

  setActiveTab(tabId: string): void {
    if (tabId !== 'profile' && tabId !== 'followers' && tabId !== 'following') {
      return;
    }

    this.activeTab = tabId;

    if (tabId === 'followers') {
      this.cargarSeguidores();
    }

    if (tabId === 'following') {
      this.cargarSiguiendo();
    }
  }

  cargarPerfil(idUsuario: number): void {
    this.loading = true;
    this.error = '';

    this.usuariosService.obtenerPerfil(idUsuario).subscribe({
      next: (perfil) => {
        this.perfil = perfil;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando perfil:', err);
        this.error = 'No se pudo cargar el perfil.';
        this.loading = false;
      }
    });
  }

  toggleSeguir(): void {
    if (!this.perfil || this.perfil.esMiPerfil || this.actionLoading) return;

    this.actionLoading = true;
    const estabaSiguiendo = this.perfil.seguidoPorMi;

    const request$ = estabaSiguiendo
      ? this.usuariosService.dejarDeSeguirUsuario(this.perfil.idUsuario)
      : this.usuariosService.seguirUsuario(this.perfil.idUsuario);

    request$.subscribe({
      next: () => {
        if (!this.perfil) return;

        this.perfil.seguidoPorMi = !estabaSiguiendo;
        this.perfil.totalSeguidores = estabaSiguiendo
          ? Math.max(0, this.perfil.totalSeguidores - 1)
          : this.perfil.totalSeguidores + 1;

        this.actionLoading = false;
      },
      error: (err) => {
        console.error('Error actualizando seguimiento:', err);
        this.actionLoading = false;
      }
    });
  }

  cargarSeguidores(): void {
    if (!this.perfil || this.loadingFollowers || this.followersLoaded) return;

    this.loadingFollowers = true;
    this.followersError = '';

    this.usuariosService.obtenerSeguidores(this.perfil.idUsuario).subscribe({
      next: (data) => {
        this.seguidores = data ?? [];
        this.followersLoaded = true;
        this.loadingFollowers = false;
      },
      error: (err) => {
        console.error('Error cargando seguidores:', err);
        this.followersError = 'No se pudieron cargar los seguidores.';
        this.loadingFollowers = false;
      }
    });
  }

  cargarSiguiendo(): void {
    if (!this.perfil || this.loadingFollowing || this.followingLoaded) return;

    this.loadingFollowing = true;
    this.followingError = '';

    this.usuariosService.obtenerSiguiendo(this.perfil.idUsuario).subscribe({
      next: (data) => {
        this.siguiendo = data ?? [];
        this.followingLoaded = true;
        this.loadingFollowing = false;
      },
      error: (err) => {
        console.error('Error cargando seguidos:', err);
        this.followingError = 'No se pudieron cargar los usuarios seguidos.';
        this.loadingFollowing = false;
      }
    });
  }

  getDisplayHandle(): string {
    if (!this.perfil?.correo) return '@usuario';
    return '@' + this.perfil.correo.split('@')[0];
  }

  getFotoPerfil(): string {
    if (!this.perfil?.fotoPerfil) return '';
    return this.buildImageUrl(this.perfil.fotoPerfil);
  }

  getFotoPortada(): string {
    if (!this.perfil?.fotoPortada) return '';
    return this.buildImageUrl(this.perfil.fotoPortada);
  }

  getUsuarioCardImage(path?: string | null): string {
    if (!path) return '';
    return this.buildImageUrl(path);
  }

  private buildImageUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `http://localhost:8080${path}`;
  }

  private resetState(): void {
    this.activeTab = 'profile';
    this.perfil = null;
    this.seguidores = [];
    this.siguiendo = [];
    this.loading = false;
    this.actionLoading = false;
    this.loadingFollowers = false;
    this.loadingFollowing = false;
    this.error = '';
    this.followersError = '';
    this.followingError = '';
    this.followersLoaded = false;
    this.followingLoaded = false;
  }
}
