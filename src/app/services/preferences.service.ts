import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { EVENT_CATEGORIES } from '../constants/categories';
import { AuthService } from './auth.service';
import { API_CONFIG } from '../config/api.config';

const STORAGE_KEY_PREFIX = 'parcha_preferences_';

export interface UserPreferences {
  completed: boolean;
  categories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  readonly categories = [...EVENT_CATEGORIES];

  private getStorageKey(): string {
    const user = this.authService.getUserData();
    const id = user?.id ?? user?.['sub'];
    const fallback = user?.correo ?? user?.usuario ?? 'anon';
    return STORAGE_KEY_PREFIX + (id != null ? String(id) : fallback);
  }

  getPreferencesFromApi(): Observable<UserPreferences> {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.preferencias.get}`;
    return this.http.get<UserPreferences>(url).pipe(
      tap(prefs => {
        if (isPlatformBrowser(this.platformId) && prefs) {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(prefs));
        }
      }),
      catchError(() => of({ completed: false, categories: [] }))
    );
  }

  savePreferencesToApi(categories: string[]): Observable<UserPreferences> {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.preferencias.put}`;
    const body = { categories };
    return this.http.put<UserPreferences>(url, body).pipe(
      tap(prefs => {
        if (isPlatformBrowser(this.platformId) && prefs) {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(prefs));
        }
      })
    );
  }

  getPreferences(): UserPreferences | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) return null;
      return JSON.parse(raw) as UserPreferences;
    } catch {
      return null;
    }
  }

  hasCompletedPreferences(): boolean {
    const prefs = this.getPreferences();
    return prefs?.completed === true;
  }

  getPreferredCategories(): string[] {
    const prefs = this.getPreferences();
    return prefs?.categories ?? [];
  }

  savePreferences(categories: string[]): Observable<UserPreferences> {
    return this.savePreferencesToApi(categories);
  }
}
