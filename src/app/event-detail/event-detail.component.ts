import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent {
  event = {
    title: 'Festival de Música Electrónica 2024',
    category: 'Música',
    description: 'Los mejores DJs internacionales en una noche épica que no podrás olvidar. Ven y disfruta de la mejor música electrónica con efectos visuales espectaculares, food trucks gourmet y una experiencia única.',
    tags: ['Música Electrónica', 'Festival', 'Noche', 'DJs', 'Baile'],
    price: 'Desde $45',
    attendees: '1250/2000 asistentes',
    date: 'Jueves, 14 de marzo de 2024',
    time: '20:00 - 06:00',
    location: 'Centro de Convenciones',
    address: 'Av. Principal 123, Zona Rosa, Ciudad de México',
    attending: '1250 personas asistirán',
    rating: 4.8,
    lineup: [
      'Martin Garrix - Headliner',
      'Tiesto - Co-Headliner',
      'David Guetta - Especial Set',
      'Armin van Buuren - Trance Stage',
      'Deadmau5 - Tech House Stage'
    ],
    experiences: [
      '5 escenarios diferentes con géneros únicos',
      'Zona VIP con bar exclusivo',
      'Food trucks gourmet',
      'Instalaciones de arte interactivo',
      'Zona de descanso climatizada'
    ],
    includes: [
      'Acceso a todos los escenarios',
      'Pulsera LED sincronizada con la música',
      'Mapa del festival',
      'Acceso a zona de hidratación gratuita'
    ],
    organizer: {
      name: 'EventPro',
      rating: 4.8,
      followers: '15,420',
      events: '37',
      email: 'info@eventpro.com',
      phone: '+52 66 1234 5678',
      website: 'Sitio web'
    }
  };
}

