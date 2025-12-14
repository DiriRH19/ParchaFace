import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventCardComponent } from '../event-card/event-card.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, EventCardComponent, NavbarComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent {
  events = [
    {
      title: 'Festival de Música Electrónica 2024',
      description: 'Los mejores DJs internacionales en una noche épica de música electrónica',
      date: 'jue, 14 mar 20:00',
      location: 'Centro de Convenciones, Ciudad de México',
      attendees: '1250/2000 asistentes',
      category: 'Música',
      tags: ['Electrónica', 'DJ', 'Noche'],
      price: 'Desde $45',
      rating: 4.8
    },
    {
      title: 'Meetup de Desarrolladores',
      description: 'Networking y charlas técnicas para desarrolladores de software',
      date: 'dom, 17 mar 18:00',
      location: 'Centro de Innovación, Guadalajara',
      attendees: '150/200 asistentes',
      category: 'Networking',
      tags: ['Desarrollo', 'Networking', 'Tecnología'],
      price: 'Gratis',
      rating: 4.5
    },
    {
      title: 'Torneo Gaming Championship',
      description: 'Competencia de esports con los mejores jugadores y premios increíbles',
      date: 'mar, 19 mar 14:00',
      location: 'Gaming Arena, Guadalajara',
      attendees: '800/1000 asistentes',
      category: 'Gaming',
      tags: ['Esports', 'Competencia', 'Premios'],
      price: 'Gratis',
      rating: 4.9
    },
    {
      title: 'Fiesta de Año Nuevo Anticipada',
      description: 'Celebra como si fuera fin de año en marzo',
      date: 'jue, 21 mar 22:00',
      location: 'Club Nocturno Elite',
      attendees: '500/800 asistentes',
      category: 'Fiesta',
      tags: ['Fiesta', 'Noche', 'Música'],
      price: '$30',
      rating: 4.7
    },
    {
      title: 'Concierto de Rock Alternativo',
      description: 'Las mejores bandas de rock alternativo en vivo',
      date: 'sáb, 23 mar 19:00',
      location: 'Auditorio Nacional',
      attendees: '850/1200 asistentes',
      category: 'Música',
      tags: ['Rock', 'Alternativo', 'Vivo'],
      price: '$55',
      rating: 4.6
    },
    {
      title: 'Feria Gastronómica 2024',
      description: 'Los mejores chefs y restaurantes de la ciudad',
      date: 'dom, 24 mar 12:00',
      location: 'Parque Central',
      attendees: '600/1000 asistentes',
      category: 'Gastronomía',
      tags: ['Comida', 'Chefs', 'Gastronomía'],
      price: '$25',
      rating: 4.8
    }
  ];
}