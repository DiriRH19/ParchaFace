import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-preferencias',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './preferencias.html',
  styleUrl: './preferencias.css',
})
export class PreferenciasComponent implements OnInit {
  selectedCategories: Set<string> = new Set();
  loading = true;
  saving = false;
  errorMessage = '';

  constructor(
    public preferencesService: PreferencesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.preferencesService.getPreferencesFromApi().subscribe({
      next: (prefs) => {
        this.loading = false;
        if (prefs.completed && prefs.categories?.length) {
          this.router.navigate(['/']);
          return;
        }
        if (prefs.categories?.length) {
          this.selectedCategories = new Set(prefs.categories);
        }
      },
      error: () => {
        this.loading = false;
        if (this.preferencesService.hasCompletedPreferences()) {
          this.router.navigate(['/']);
        }
      }
    });
  }

  toggle(category: string): void {
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }
    this.selectedCategories = new Set(this.selectedCategories);
  }

  isSelected(category: string): boolean {
    return this.selectedCategories.has(category);
  }

  continue(): void {
    const list = Array.from(this.selectedCategories);
    if (list.length === 0) return;
    this.errorMessage = '';
    this.saving = true;
    this.preferencesService.savePreferences(list).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message ?? '';
        const rawBody = typeof err?.error === 'string' ? err.error : '';
        const isHtmlResponse = rawBody.startsWith('<') || (typeof msg === 'string' && (msg.includes('<!DOCTYPE') || msg.includes('Unexpected token') || msg.includes('is not valid JSON')));
        if (err?.status === 401) {
          this.errorMessage = 'Sesión no válida. Cierra sesión e inicia de nuevo (o regístrate).';
        } else if (err?.status === 0 || msg?.includes('Unknown')) {
          this.errorMessage = 'No se pudo conectar con el servidor. ¿Está el backend en marcha en el puerto 8080?';
        } else if (isHtmlResponse) {
          this.errorMessage = 'El servidor devolvió una página en lugar de datos. Arranca el backend (puerto 8080) y abre el front con: ng serve';
        } else {
          this.errorMessage = msg ? String(msg) : 'No se pudieron guardar las preferencias. Intenta de nuevo.';
        }
      }
    });
  }

  canContinue(): boolean {
    return this.selectedCategories.size > 0 && !this.saving;
  }
}
