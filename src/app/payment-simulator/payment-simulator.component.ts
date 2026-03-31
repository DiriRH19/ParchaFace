import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  PagoDetalleResponse,
  PagoService
} from '../services/pago.service';

@Component({
  selector: 'app-payment-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap">
      <div class="card" *ngIf="!loading && pago; else loadingTpl">
        <h1>Pasarela de pago simulada</h1>
        <p class="muted">
          No ingreses datos reales. Este módulo es solo demostrativo.
        </p>

        <div class="resume">
          <p><strong>Evento:</strong> {{ pago.tituloEvento }}</p>
          <p><strong>Referencia:</strong> {{ pago.referencia }}</p>
          <p><strong>Estado:</strong> {{ pago.estado }}</p>
          <p><strong>Monto:</strong> {{ pago.monto | currency:'COP':'symbol':'1.0-0' }}</p>
        </div>

        <div class="methods" *ngIf="pago.estado === 'PENDIENTE'">
          <label>
            <input type="radio" name="metodo" [(ngModel)]="metodoPago" value="TARJETA" />
            Tarjeta
          </label>

          <label>
            <input type="radio" name="metodo" [(ngModel)]="metodoPago" value="PSE" />
            PSE
          </label>

          <label>
            <input type="radio" name="metodo" [(ngModel)]="metodoPago" value="NEQUI" />
            Nequi
          </label>
        </div>

        <div class="mock-box" *ngIf="pago.estado === 'PENDIENTE'">
          <div *ngIf="metodoPago === 'TARJETA'">
            <label>Número de tarjeta</label>
            <input type="text" placeholder="4242 4242 4242 4242" disabled />

            <label>Nombre</label>
            <input type="text" placeholder="Parcha Face" disabled />

            <label>Vencimiento</label>
            <input type="text" placeholder="12/30" disabled />

            <label>CVV</label>
            <input type="text" placeholder="123" disabled />
          </div>

          <div *ngIf="metodoPago === 'PSE'">
            <label>Banco</label>
            <input type="text" placeholder="Bancolombia" disabled />

            <label>Tipo de persona</label>
            <input type="text" placeholder="Natural" disabled />
          </div>

          <div *ngIf="metodoPago === 'NEQUI'">
            <label>Número celular</label>
            <input type="text" placeholder="3001234567" disabled />
          </div>
        </div>

        <div class="actions" *ngIf="pago.estado === 'PENDIENTE'">
          <button class="ok" (click)="procesar('PAGADO')" [disabled]="processing">
            Simular pago exitoso
          </button>

          <button class="warn" (click)="procesar('RECHAZADO')" [disabled]="processing">
            Simular rechazo
          </button>

          <button class="ghost" (click)="procesar('CANCELADO')" [disabled]="processing">
            Cancelar
          </button>
        </div>

        <div class="actions" *ngIf="pago.estado !== 'PENDIENTE'">
          <button class="ok" (click)="volverEvento()">Volver al evento</button>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="card">
          <h2 *ngIf="loading">Cargando pago...</h2>
          <h2 *ngIf="!loading && errorMsg">{{ errorMsg }}</h2>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .wrap {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f5f7fb;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 520px;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
      padding: 24px;
    }

    h1, h2 {
      margin: 0 0 12px;
    }

    .muted {
      color: #6b7280;
      margin-bottom: 20px;
    }

    .resume {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 18px;
    }

    .methods {
      display: grid;
      gap: 10px;
      margin-bottom: 18px;
    }

    .methods label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mock-box {
      display: grid;
      gap: 10px;
      margin-bottom: 18px;
    }

    .mock-box label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-top: 8px;
      display: block;
    }

    .mock-box input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #f9fafb;
      box-sizing: border-box;
    }

    .actions {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    button {
      border: none;
      border-radius: 12px;
      padding: 12px 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .ok {
      background: #111827;
      color: white;
    }

    .warn {
      background: #f59e0b;
      color: white;
    }

    .ghost {
      background: #e5e7eb;
      color: #111827;
    }

    button:disabled {
      opacity: .7;
      cursor: not-allowed;
    }
  `]
})
export class PaymentSimulatorComponent implements OnInit {
  loading = true;
  processing = false;
  errorMsg = '';
  pago: PagoDetalleResponse | null = null;
  metodoPago: 'TARJETA' | 'PSE' | 'NEQUI' = 'TARJETA';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagoService: PagoService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('idPago');
    const idPago = Number(idParam);

    if (!idParam || Number.isNaN(idPago) || idPago <= 0) {
      this.loading = false;
      this.errorMsg = 'ID de pago inválido.';
      return;
    }

    this.cargarPago(idPago);
  }

  private cargarPago(idPago: number): void {
    this.loading = true;
    this.errorMsg = '';

    this.pagoService.obtenerPago(idPago).subscribe({
      next: (resp) => {
        this.pago = resp;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.message ||
          err?.error?.error ||
          err?.error ||
          'No se pudo cargar el pago.';
      }
    });
  }

  procesar(resultado: 'PAGADO' | 'RECHAZADO' | 'CANCELADO'): void {
    if (!this.pago?.idPago) return;

    this.processing = true;

    this.pagoService.simularPago(this.pago.idPago, {
      metodoPago: this.metodoPago,
      resultado
    }).subscribe({
      next: (resp) => {
        this.processing = false;

        if (this.pago) {
          this.pago.estado = resp?.estado || resultado;
          this.pago.metodoPago = resp?.metodoPago || this.metodoPago;
        }

        if (resultado === 'PAGADO') {
          Swal.fire({
            icon: 'success',
            title: 'Pago aprobado',
            text: 'Tu inscripción fue confirmada correctamente.'
          }).then(() => this.volverEvento());
          return;
        }

        if (resultado === 'RECHAZADO') {
          Swal.fire({
            icon: 'error',
            title: 'Pago rechazado',
            text: 'El pago fue rechazado en la simulación.'
          });
          return;
        }

        Swal.fire({
          icon: 'info',
          title: 'Pago cancelado',
          text: 'El pago fue cancelado.'
        });
      },
      error: (err) => {
        this.processing = false;

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.error ||
          'No se pudo procesar el pago.';

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonText: 'Ok'
        });
      }
    });
  }

  volverEvento(): void {
    if (!this.pago?.eventoId) {
      this.router.navigate(['/explore']);
      return;
    }

    this.router.navigate(['/event', this.pago.eventoId]);
  }
}