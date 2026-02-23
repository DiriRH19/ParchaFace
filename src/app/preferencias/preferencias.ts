import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

  private returnTo: string | null = null;

  constructor(
    public preferencesService: PreferencesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');

    this.preferencesService.getPreferencesFromApi().subscribe({
      next: (prefs) => {
        this.loading = false;
        if (prefs.categories?.length) {
          this.selectedCategories = new Set(prefs.categories); // ✅ pinta las que ya tenía
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggle(category: string): void {
    if (this.selectedCategories.has(category)) this.selectedCategories.delete(category);
    else this.selectedCategories.add(category);

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

        // ✅ si vienes del perfil, vuelve al perfil
        if (this.returnTo === 'profile') {
          this.router.navigate(['/profile']);
        } else {
          // ✅ flujo normal (registro) -> home
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message ?? '';
        this.errorMessage = msg ? String(msg) : 'No se pudieron guardar las preferencias.';
      }
    });
  }

  canContinue(): boolean {
    return this.selectedCategories.size > 0 && !this.saving;
  }
}