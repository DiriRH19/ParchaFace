import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserData } from '../../services/auth.service';
import { Subscription } from 'rxjs';

type EmergencyItem = {
  icon: string;
  name: string;
  number: string;  // texto visible
  tel: string;     // tel: limpio
  desc: string;
  primary?: boolean;
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userData: UserData | null = null;
  private subscriptions = new Subscription();

  // =========================
  // ✅ Emergencias (modal)
  // =========================
  showEmergencyModal = false;
  readonly year = new Date().getFullYear();

  readonly colombia: EmergencyItem[] = [
    { icon: '🚨', name: 'Línea Única', number: '123', tel: '123', desc: 'Policía, Bomberos, Ambulancia', primary: true },
    { icon: '🚒', name: 'Bomberos', number: '119', tel: '119', desc: 'Incendios / rescate' },
    { icon: '🛟', name: 'Defensa Civil', number: '132', tel: '132', desc: 'Gestión del riesgo' },
    { icon: '👮', name: 'Policía', number: '112', tel: '112', desc: 'Seguridad / apoyo' }
  ];

  readonly armenia: EmergencyItem[] = [
    { icon: '🚨', name: 'Línea Única', number: '123', tel: '123', desc: 'Atención inmediata', primary: true },
    // Armenia/Quindío indicativo 606 — en tel usamos internacional +57
    { icon: '🛟', name: 'Defensa Civil Quindío', number: '(606) 735 9733', tel: '+576067359733', desc: 'Apoyo y emergencias' },
    { icon: '🚒', name: 'Bomberos', number: '119', tel: '119', desc: 'Incendios / rescate' },
    { icon: '⛑️', name: 'Cruz Roja / Emergencias', number: '132', tel: '132', desc: 'Asistencia humanitaria' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const loginSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });

    const userSub = this.authService.userData$.subscribe(userData => {
      this.userData = userData;
    });

    this.subscriptions.add(loginSub);
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.unlockScroll(); // por si se destruye abierto
  }

  // =========================
  // ✅ Acciones existentes
  // =========================
  onCreateEventClick(): void {
    if (this.authService.getIsLoggedIn()) {
      this.router.navigate(['/create-event']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onLogoutClick(): void {
    this.authService.logout();
  }

  // =========================
  // ✅ Emergencias modal
  // =========================
  toggleEmergencyModal(): void {
    this.showEmergencyModal = !this.showEmergencyModal;
    this.showEmergencyModal ? this.lockScroll() : this.unlockScroll();
  }

  closeEmergencyModal(): void {
    if (!this.showEmergencyModal) return;
    this.showEmergencyModal = false;
    this.unlockScroll();
  }

  private lockScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = 'hidden';
  }

  private unlockScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = '';
  }
}
