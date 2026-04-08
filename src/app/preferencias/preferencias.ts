import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-preferencias',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './preferencias.html',
  styleUrls: ['./preferencias.css']
})
export class PreferenciasComponent implements OnInit {
  categorias: string[] = [
    'Música',
    'Gaming',
    'Fiestas',
    'Networking',
    'Deportes',
    'Gastronomía'
  ];

  categoriasSeleccionadas: string[] = [];
  isLoading = false;
  isLoadingInitial = false;
  errorMessage = '';

  constructor(
    private preferencesService: PreferencesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargarPreferencias();
  }

  isCategoriaSeleccionada(categoria: string): boolean {
    return this.categoriasSeleccionadas.includes(categoria);
  }

  toggleCategoria(categoria: string): void {
    this.errorMessage = '';

    if (this.isCategoriaSeleccionada(categoria)) {
      this.categoriasSeleccionadas = this.categoriasSeleccionadas.filter(c => c !== categoria);
      return;
    }

    this.categoriasSeleccionadas = [...this.categoriasSeleccionadas, categoria];
  }

  continuar(): void {
    this.errorMessage = '';

    if (this.categoriasSeleccionadas.length === 0) {
      this.errorMessage = 'Debes seleccionar al menos una categoría.';
      return;
    }

    this.isLoading = true;

    this.preferencesService.savePreferences(this.categoriasSeleccionadas)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          this.router.navigateByUrl(this.obtenerRutaRetorno());
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            error?.error?.error ||
            'No se pudieron guardar tus preferencias. Inténtalo de nuevo.';
        }
      });
  }

  private cargarPreferencias(): void {
    this.isLoadingInitial = true;

    this.preferencesService.getPreferencesFromApi()
      .pipe(finalize(() => this.isLoadingInitial = false))
      .subscribe({
        next: (response) => {
          const preferencias = this.extraerCategorias(response);
          this.categoriasSeleccionadas = this.normalizarCategorias(preferencias);
        },
        error: () => {
          this.categoriasSeleccionadas = [];
        }
      });
  }

  private extraerCategorias(response: any): string[] {
    if (!response) return [];

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response.categories)) {
      return response.categories;
    }

    if (Array.isArray(response.categoriasPreferidas)) {
      return response.categoriasPreferidas;
    }

    if (Array.isArray(response.categorias)) {
      return response.categorias;
    }

    if (Array.isArray(response.preferencias)) {
      return response.preferencias;
    }

    return [];
  }

  private normalizarCategorias(values: string[]): string[] {
    const mapa = new Map(
      this.categorias.map(categoria => [this.normalizarTexto(categoria), categoria])
    );

    return values
      .map(value => mapa.get(this.normalizarTexto(value)))
      .filter((value): value is string => !!value);
  }

  private normalizarTexto(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private obtenerRutaRetorno(): string {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo')?.trim();

    if (!returnTo) {
      return '/profile';
    }

    if (returnTo.startsWith('/')) {
      return returnTo;
    }

    return `/${returnTo}`;
  }
}