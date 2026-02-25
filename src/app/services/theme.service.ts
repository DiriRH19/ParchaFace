import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';
  private readonly DARK_CLASS = 'dark';

  // En SSR no podemos leer window/localStorage al construir el servicio.
  // Arrancamos en 'light' y en el browser initTheme() lo ajusta.
  private currentTheme$ = new BehaviorSubject<Theme>('light');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Inicializa el tema desde localStorage o preferencia del sistema
   */
  initTheme(): void {
    if (!this.isBrowser()) return;
    const savedTheme = this.getSavedTheme();
    const theme = savedTheme ?? this.getSystemTheme();
    this.setTheme(theme);
  }

  /**
   * Obtiene el tema actual como Observable
   */
  getThemeObservable(): Observable<Theme> {
    return this.currentTheme$.asObservable();
  }

  /**
   * Obtiene el tema actual
   */
  getTheme(): Theme {
    return this.currentTheme$.value;
  }

  /**
   * Establece el tema y lo persiste
   */
  setTheme(theme: Theme): void {
    this.currentTheme$.next(theme);
    this.applyTheme(theme);
    this.saveTheme(theme);
  }

  /**
   * Cambia entre tema oscuro y claro
   */
  toggleTheme(): void {
    const newTheme: Theme = this.getTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Aplica la clase dark al documentElement
   */
  private applyTheme(theme: Theme): void {
    if (!this.isBrowser()) return;
    const html = this.document.documentElement;
    html.classList.toggle(this.DARK_CLASS, theme === 'dark');
  }

  /**
   * Obtiene el tema guardado en localStorage
   */
  private getSavedTheme(): Theme | null {
    if (!this.isBrowser()) return null;
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? (saved as Theme) : null;
  }

  /**
   * Guarda el tema en localStorage
   */
  private saveTheme(theme: Theme): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  /**
   * Obtiene la preferencia del sistema usando prefers-color-scheme
   */
  private getSystemTheme(): Theme {
    if (!this.isBrowser()) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
