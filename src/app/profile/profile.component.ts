import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  activeTab = 'profile';

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

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }
}
