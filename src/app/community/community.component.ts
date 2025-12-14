import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent {
  stats = [
    { value: '25,430', label: 'Usuarios Activos', color: 'yellow' },
    { value: '1,250', label: 'Eventos Totales', color: 'purple' },
    { value: '340', label: 'Organizadores', color: 'red' },
    { value: '89', label: 'Este Mes', color: 'yellow' }
  ];

  organizers = [
    {
      name: 'EventPro',
      location: 'Ciudad de México',
      rating: 4.8,
      description: 'Organizamos los mejores eventos de música electrónica en México',
      tags: ['Música', 'Festivales', 'Conciertos'],
      followers: '15,420',
      events: '87',
      recentEvent: 'Festival de Música Electrónica 2024',
      isFollowing: false
    },
    {
      name: 'GameMasters',
      location: 'Guadalajara',
      rating: 4.9,
      description: 'La comunidad gaming más grande de México',
      tags: ['Gaming', 'Esports', 'Torneos'],
      followers: '8,930',
      events: '45',
      recentEvent: 'Torneo Gaming Championship',
      isFollowing: true
    },
    {
      name: 'TechMeetups',
      location: 'Monterrey',
      rating: 4.7,
      description: 'Conectando desarrolladores y emprendedores',
      tags: ['Tecnología', 'Networking', 'Startups'],
      followers: '5,200',
      events: '32',
      recentEvent: 'Startup Pitch Night',
      isFollowing: false
    }
  ];

  activeFilter = 'popular';
}
