import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedIn.asObservable();
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.validateToken();
  }

  private validateToken(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    const token = localStorage.getItem('authToken');
    if (token && this.isTokenValid(token)) {
      this.isLoggedIn.next(true);
    } else {
      this.isLoggedIn.next(false);
      localStorage.removeItem('authToken');
    }
  }

  private isTokenValid(token: string | null): boolean {
    return token !== null && token.length > 0;
  }

  login(email: string, password: string): void {
    if (email && password && isPlatformBrowser(this.platformId)) {
      const token = 'temp-token-' + Date.now();
      localStorage.setItem('authToken', token);
      this.isLoggedIn.next(true);
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('authToken');
    }
    this.isLoggedIn.next(false);
  }

  getIsLoggedIn(): boolean {
    return this.isLoggedIn.value;
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('authToken');
  }
}
