import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface Event {
  title: string;
  description: string;
  date: string;
  location: string;
  attendees: string;
  category: string;
  tags: string[];
  price: string;
  rating: number;
}

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.css']
})
export class EventCardComponent {
  @Input() event: Event = {
    title: 'Evento',
    description: '',
    date: '',
    location: '',
    attendees: '',
    category: '',
    tags: [],
    price: 'Gratis',
    rating: 0
  };
}