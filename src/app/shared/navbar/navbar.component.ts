import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserData } from '../../services/auth.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { Subscription } from 'rxjs';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { NotificacionesStore } from '../../services/notificaciones-store.service';
import { buildMediaUrl } from '../../config/api.config';
import { filter } from 'rxjs/operators';

type EmergencyItem = {
  icon: string;
  name: string;
  number: string;
  tel: string;
  desc: string;
  primary?: boolean;
};

type TransportItem = {
  icon: string;
  name: string;
  number: string;
  href: string;
  desc: string;
  primary?: boolean;
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent, NotificationBellComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  authChecked = false;
  userData: UserData | null = null;
  private subscriptions = new Subscription();
  navbarProfileImage = '';
  private profileImageRequested = false;

  constructor(
    private authService: AuthService,
    public router: Router,
    private notificacionesStore: NotificacionesStore
  ) {}

  showEmergencyModal = false;
  readonly year = new Date().getFullYear();

  readonly colombia = signal<EmergencyItem[]>([
    { icon: '🚨', name: 'Línea Única', number: '123', tel: '123', desc: 'Policía, Bomberos, Ambulancia', primary: true },
    { icon: '🚒', name: 'Bomberos', number: '119', tel: '119', desc: 'Incendios / rescate' },
    { icon: '🛟', name: 'Defensa Civil', number: '132', tel: '132', desc: 'Gestión del riesgo' },
    { icon: '👮', name: 'Policía', number: '112', tel: '112', desc: 'Seguridad / apoyo' }
  ]);

  readonly armenia = signal<EmergencyItem[]>([
    { icon: '🚨', name: 'Línea Única', number: '123', tel: '123', desc: 'Atención inmediata', primary: true },
    { icon: '🛟', name: 'Defensa Civil Quindío', number: '(606) 735 9733', tel: '+576067359733', desc: 'Apoyo y emergencias' },
    { icon: '🚒', name: 'Bomberos', number: '119', tel: '119', desc: 'Incendios / rescate' },
    { icon: '⛑️', name: 'Cruz Roja / Emergencias', number: '132', tel: '132', desc: 'Asistencia humanitaria' }
  ]);

  showTransportModal = false;

  readonly transportApps = signal<TransportItem[]>([
    { icon: '🚗', name: 'inDrive', number: 'Web', desc: 'Abrir sitio', href: 'https://indrive.com/es-co', primary: true },
    { icon: '🚘', name: 'Uber', number: 'Web', desc: 'Abrir sitio', href: 'https://www.uber.com/co/es/' },
    { icon: '🚕', name: 'DiDi', number: 'Web', desc: 'Abrir sitio', href: 'https://web.didiglobal.com/co/pasajero/' },
    { icon: '🛵', name: 'Picap', number: 'Web', desc: 'Abrir sitio', href: 'https://picap.app/' }
  ]);

  readonly taxisArmenia = signal<TransportItem[]>([
    { icon: '🚌', name: 'BUSES TINTO', number: '', desc: 'Pagina Web', href: 'https://tinto.com.co/ruta3.htm', primary: true },
    { icon: '💬', name: 'Radio Taxi del Quindío', number: '311 542 2222', desc: 'WhatsApp', href: 'https://wa.me/573115422222', primary: true },
    { icon: '📞', name: 'Radio Taxi del Quindío', number: '(606) 746 2222', desc: 'Pedidos', href: 'tel:+576067462222' },
    { icon: '📞', name: 'Tax Páramo S.A', number: '(606) 740 2254', desc: 'Servicio al cliente', href: 'tel:+576067402254' },
    { icon: '📞', name: 'Cooperativa de Motoristas del Quindío', number: '(606) 748 1111', desc: 'Servicio al cliente', href: 'tel:+576067481111' },
    { icon: '💬', name: 'Taxis Armenia', number: '314 751 1530', desc: 'WhatsApp', href: 'https://wa.me/573147511530' },
    { icon: '📞', name: 'Taxis Armenia', number: '314 751 1530', desc: 'Llamar', href: 'tel:+573147511530' }
  ]);

  readonly taxisColombia = signal<TransportItem[]>([
    { icon: '💬', name: 'Taxis Libres', number: '310 211 1111', desc: 'WhatsApp', href: 'https://wa.me/573102111111', primary: true },
    { icon: '📞', name: 'Taxis Libres Bogotá', number: '(601) 311 1111', desc: 'Teléfono', href: 'tel:+576013111111' },
    { icon: '📞', name: 'Taxis Libres Bogotá', number: '(601) 211 1111', desc: 'Teléfono', href: 'tel:+576012111111' },
    { icon: '📞', name: 'Taxis Libres Cali', number: '(602) 444 4444', desc: 'Teléfono', href: 'tel:+576024444444' },
    { icon: '📞', name: 'Taxis Libres Medellín', number: '(604) 311 1111', desc: 'Teléfono', href: 'tel:+576043111111' }
  ]);

  ngOnInit(): void {
    const loginSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      this.authChecked = true;

      if (isLoggedIn) {
        this.notificacionesStore.startPolling(15000);
      } else {
        this.notificacionesStore.stopPolling();
        this.notificacionesStore.clear();
      }
    });

    const userSub = this.authService.userData$.subscribe(userData => {
      this.userData = userData;
      this.syncNavbarProfileImage();
    });

    const routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {});

    this.subscriptions.add(routerSub);
    this.subscriptions.add(loginSub);
    this.subscriptions.add(userSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.unlockScroll();
  }

  get isAdminOnlyNavbar(): boolean {
    return this.isLoggedIn && this.authService.isAdmin();
  }

  get logoRoute(): string {
    return this.isAdminOnlyNavbar ? '/admin' : '/explore';
  }

  onCreateEventClick(): void {
    if (this.authService.getIsLoggedIn()) {
      this.router.navigate(['/create-event']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onLogoutClick(): void {
    this.authService.logout();
    this.notificacionesStore.clear();
  }

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

  toggleTransportModal(): void {
    this.showTransportModal = !this.showTransportModal;
    this.showTransportModal ? this.lockScroll() : this.unlockScroll();
  }

  closeTransportModal(): void {
    if (!this.showTransportModal) return;
    this.showTransportModal = false;
    this.unlockScroll();
  }

  isExternal(href: string): boolean {
    return href.startsWith('http');
  }

  private syncNavbarProfileImage(): void {
    const currentPhoto = this.userData?.fotoPerfil || this.userData?.fotoPerfilUrl;

    if (currentPhoto) {
      this.navbarProfileImage = buildMediaUrl(currentPhoto);
      this.profileImageRequested = false;
      return;
    }

    const userId = this.userData?.id || this.userData?.idUsuario;

    if (!userId || this.profileImageRequested) {
      this.navbarProfileImage = '';
      return;
    }

    this.profileImageRequested = true;

    this.authService.getUsuarioById(userId).subscribe({
      next: (user) => {
        this.userData = { ...(this.userData || {}), ...(user || {}) };

        const freshPhoto = user?.fotoPerfil || user?.fotoPerfilUrl;
        this.navbarProfileImage = freshPhoto ? buildMediaUrl(freshPhoto) : '';
        this.profileImageRequested = false;
      },
      error: (err) => {
        console.error('Error cargando foto del navbar:', err);
        this.navbarProfileImage = '';
        this.profileImageRequested = false;
      }
    });
  }
}