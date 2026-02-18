import { Component, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserData } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  interests = ['Música', 'Gaming', 'Tecnología', 'Networking', 'Fiestas'];

  selectedPerfil: File | null = null;
  selectedPortada: File | null = null;

  socialNetworks = [
    { platform: 'Instagram', handle: '@juanperez_mx' },
    { platform: 'Twitter', handle: '@juanperez' },
    { platform: 'Facebook', handle: 'juan.perez.mx' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // 1) datos básicos desde el token
    this.userData = this.authService.getUserData();

    // 2) escuchar cambios del AuthService
    this.authService.userData$.subscribe(userData => {
      this.userData = userData;

      // 3) cuando ya haya id, traer datos completos (incluye fotoPerfil/fotoPortada)
      if (this.userData?.id) {
        this.authService.getUsuarioById(this.userData.id).subscribe(u => {
          this.userData = { ...this.userData, ...u };
        });
      }
    });

    // En caso de que ya exista id desde el arranque:
    if (this.userData?.id) {
      this.authService.getUsuarioById(this.userData.id).subscribe(u => {
        this.userData = { ...this.userData, ...u };
      });
    }
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

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
