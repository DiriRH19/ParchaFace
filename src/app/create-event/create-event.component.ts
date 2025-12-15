import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent {

  currentStep = 1;
  totalSteps = 4;

  eventData = {
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    date: '',
    startTime: '',
    endTime: '',
    isOnline: false,
    placeName: '',
    address: '',
    city: '',
    maxAttendees: '',
    isFree: true,
    requiresApproval: false,
    contactEmail: '',
    contactPhone: '',
    website: '',
    isPublic: true,
    allowComments: true,
    sendReminders: true,
    collectFeedback: true
  };

  newTag = '';

  steps = [
    { id: 1, title: 'Información Básica', description: 'Título, descripción y categoría', icon: '' },
    { id: 2, title: 'Fecha y Lugar', description: 'Cuándo y dónde será tu evento', icon: '' },
    { id: 3, title: 'Detalles', description: 'Capacidad, precio y contacto', icon: '' },
    { id: 4, title: 'Configuración', description: 'Privacidad y configuraciones finales', icon: '' }
  ];

  constructor(
    private eventoService: EventoService,
    private router: Router
  ) {}

  addTag() {
    if (this.newTag.trim() && !this.eventData.tags.includes(this.newTag.trim())) {
      this.eventData.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string) {
    this.eventData.tags = this.eventData.tags.filter(t => t !== tag);
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepComplete(step: number): boolean {
    return step < this.currentStep;
  }

  createEvent() {
    this.eventoService.crearEvento(this.eventData).subscribe({
      next: () => this.router.navigate(['/eventos']),
      error: err => console.error('Error creando evento', err)
    });
  }
}
