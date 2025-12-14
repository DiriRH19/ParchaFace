import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.css']
})
export class EventCardComponent {
  @Input() event: any = {
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