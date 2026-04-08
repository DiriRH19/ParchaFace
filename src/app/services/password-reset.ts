import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  constructor(private http: HttpClient) {}

  forgotPassword(correo: string): Observable<any> {
    return this.http.post(buildApiUrl('/auth/forgot-password'), { correo });
  }

  resetPassword(
    correo: string,
    codigo: string,
    nuevaContrasena: string
  ): Observable<any> {
    return this.http.post(buildApiUrl('/auth/reset-password'), {
      correo,
      codigo,
      nuevaContrasena,
    });
  }

  verifyResetCode(correo: string, codigo: string): Observable<any> {
    return this.http.post(buildApiUrl('/auth/verify-reset-code'), {
      correo,
      codigo,
    });
  }
}
