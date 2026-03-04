import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  // AJUSTA si tu backend usa otro host/puerto
  private baseUrl = '/auth';

  constructor(private http: HttpClient) {}

  forgotPassword(correo: string): Observable<any> {
    // tu backend espera: { correo: "..." }
    return this.http.post(`${this.baseUrl}/forgot-password`, { correo });
  }

  resetPassword(correo: string, codigo: string, nuevaContrasena: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, {
      correo,
      codigo,
      nuevaContrasena,
    });
  }

  verifyResetCode(correo: string, codigo: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/verify-reset-code`, { correo, codigo });
}
}
