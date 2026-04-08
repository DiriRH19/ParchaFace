import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../config/api.config';

export interface PagoCreadoResponse {
  message: string;
  idPago: number;
  estado: string;
  monto: number;
  referencia: string;
  eventoId: number;
}

export interface PagoDetalleResponse {
  idPago: number;
  estado: string;
  monto: number;
  referencia: string;
  metodoPago: string | null;
  eventoId: number;
  tituloEvento: string;
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  constructor(private http: HttpClient) {}

  crearPago(idEvento: number): Observable<PagoCreadoResponse> {
    return this.http.post<PagoCreadoResponse>(
      buildApiUrl(`/api/pagos/eventos/${idEvento}/crear`),
      {}
    );
  }

  obtenerPago(idPago: number): Observable<PagoDetalleResponse> {
    return this.http.get<PagoDetalleResponse>(
      buildApiUrl(`/api/pagos/${idPago}`)
    );
  }

  simularPago(
    idPago: number,
    payload: { metodoPago: string; resultado: string }
  ): Observable<any> {
    return this.http.post<any>(
      buildApiUrl(`/api/pagos/${idPago}/simular`),
      payload
    );
  }
}
