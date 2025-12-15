import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  socialNetworks = [
    { platform: 'Instagram', handle: '@juanperez_mx' },
    { platform: 'Twitter', handle: '@juanperez' },
    { platform: 'Facebook', handle: 'juan.perez.mx' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userData = this.authService.getUserData();
    
    this.authService.userData$.subscribe(userData => {
      this.userData = userData;
    });
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  getUserName(): string {
    return this.userData?.usuario || this.userData?.nombre || 'Usuario';
  }

  getUserEmail(): string {
    return this.userData?.correo || '';
  }
}
