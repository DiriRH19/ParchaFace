import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface EmergencyItem {
  name: string;
  number: string;
  tel: string;
  desc: string;
  icon: string;
  primary?: boolean;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  year = new Date().getFullYear();
  showEmergencyModal = false;

  readonly colombiaList: EmergencyItem[] = [
    {
      name: 'Línea única de emergencias',
      number: '123',
      tel: '123',
      desc: 'Policía, ambulancia, bomberos y atención inmediata.',
      icon: '✦',
      primary: true
    },
    {
      name: 'Policía Nacional',
      number: '112',
      tel: '112',
      desc: 'Atención policial en situaciones de riesgo o denuncia.',
      icon: '◈'
    },
    {
      name: 'Bomberos',
      number: '119',
      tel: '119',
      desc: 'Incendios, rescates y emergencias estructurales.',
      icon: '△'
    },
    {
      name: 'Cruz Roja',
      number: '132',
      tel: '132',
      desc: 'Apoyo en emergencias médicas y desastres.',
      icon: '⊕'
    },
    {
      name: 'Defensa Civil',
      number: '144',
      tel: '144',
      desc: 'Atención y gestión en desastres o contingencias.',
      icon: '◌'
    }
  ];

  readonly armeniaList: EmergencyItem[] = [
    {
      name: 'Línea de emergencias',
      number: '123',
      tel: '123',
      desc: 'Canal principal de atención inmediata en Armenia.',
      icon: '✦',
      primary: true
    },
    {
      name: 'Policía Armenia',
      number: '123 / 112',
      tel: '123',
      desc: 'Seguridad ciudadana y atención policial local.',
      icon: '◈'
    },
    {
      name: 'Bomberos Armenia',
      number: '119',
      tel: '119',
      desc: 'Atención de incendios, rescate y apoyo técnico.',
      icon: '△'
    },
    {
      name: 'Ambulancias / urgencias',
      number: '123',
      tel: '123',
      desc: 'Canal de atención inmediata para emergencias médicas.',
      icon: '⊕'
    }
  ];

  toggleEmergencyModal(): void {
    this.showEmergencyModal = !this.showEmergencyModal;
  }

  closeEmergencyModal(): void {
    this.showEmergencyModal = false;
  }
}
