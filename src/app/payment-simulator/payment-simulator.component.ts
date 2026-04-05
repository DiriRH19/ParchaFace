import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParchaSwal } from '../shared/swal/parcha-swal';

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
        <div class="header">
          <div>
            <p class="eyebrow">Checkout</p>
            <h1>Completa tu pago</h1>
            <p class="muted">
              Finaliza el pago para confirmar tu inscripción al evento.
            </p>
          </div>

          <div class="secure-badge">
            <span class="lock">🔒</span>
            <span>Pago seguro</span>
          </div>
        </div>

        <div class="resume">
          <div class="resume-row">
            <span>Evento</span>
            <strong>{{ pago.tituloEvento }}</strong>
          </div>

          <div class="resume-row">
            <span>Referencia</span>
            <strong>{{ pago.referencia }}</strong>
          </div>

          <div class="resume-row">
            <span>Estado</span>
            <strong [ngClass]="statusClass(pago.estado)">{{ pago.estado }}</strong>
          </div>

          <div class="resume-row total">
            <span>Total</span>
            <strong>{{ pago.monto | currency:'COP':'symbol':'1.0-0' }}</strong>
          </div>
        </div>

        <div class="method-grid" *ngIf="pago.estado === 'PENDIENTE'">
          <button
            type="button"
            class="method-card"
            [class.active]="metodoPago === 'TARJETA'"
            (click)="seleccionarMetodo('TARJETA')"
          >
            <div class="method-top">
              <span class="radio-dot" [class.checked]="metodoPago === 'TARJETA'"></span>
              <span class="method-title">Tarjeta</span>
            </div>

            <div class="brand-row">
              <span class="brand-chip visa">VISA</span>
              <span class="brand-chip mastercard">Mastercard</span>
            </div>
          </button>

          <button
            type="button"
            class="method-card"
            [class.active]="metodoPago === 'PSE'"
            (click)="seleccionarMetodo('PSE')"
          >
            <div class="method-top">
              <span class="radio-dot" [class.checked]="metodoPago === 'PSE'"></span>
              <span class="method-title">PSE</span>
            </div>

            <div class="brand-row">
              <span class="brand-chip pse">PSE</span>
              <span class="brand-sub">Pago en línea</span>
            </div>
          </button>

          <button
            type="button"
            class="method-card"
            [class.active]="metodoPago === 'NEQUI'"
            (click)="seleccionarMetodo('NEQUI')"
          >
            <div class="method-top">
              <span class="radio-dot" [class.checked]="metodoPago === 'NEQUI'"></span>
              <span class="method-title">Nequi</span>
            </div>

            <div class="brand-row">
              <span class="brand-chip nequi">Nequi</span>
              <span class="brand-sub">Billetera digital</span>
            </div>
          </button>
        </div>

        <div class="form-box" *ngIf="pago.estado === 'PENDIENTE'">
          <div *ngIf="metodoPago === 'TARJETA'">
            <div class="card-visual">
              <div class="card-visual-top">
                <span class="chip"></span>
                <span class="brand-chip visa small">VISA</span>
              </div>

              <div class="card-number-preview">
                {{ cardNumber || '•••• •••• •••• ••••' }}
              </div>

              <div class="card-visual-bottom">
                <div>
                  <label class="preview-label">Titular</label>
                  <div>{{ cardHolder || 'NOMBRE DEL TITULAR' }}</div>
                </div>

                <div>
                  <label class="preview-label">Vence</label>
                  <div>{{ cardExpiry || 'MM/AA' }}</div>
                </div>
              </div>
            </div>

            <label>Número de tarjeta</label>
            <input
              type="text"
              [(ngModel)]="cardNumber"
              (input)="onCardNumberInput()"
              placeholder="Número de tarjeta"
              maxlength="19"
              inputmode="numeric"
            />

            <label>Nombre del titular</label>
            <input
              type="text"
              [(ngModel)]="cardHolder"
              placeholder="Como aparece en la tarjeta"
            />

            <div class="row">
              <div>
                <label>Vencimiento</label>
                <input
                  type="text"
                  [(ngModel)]="cardExpiry"
                  (input)="onCardExpiryInput()"
                  placeholder="MM/AA"
                  maxlength="5"
                  inputmode="numeric"
                />
              </div>

              <div>
                <label>CVV</label>
                <input
                  type="password"
                  [(ngModel)]="cardCvv"
                  (input)="onCardCvvInput()"
                  placeholder="CVV"
                  maxlength="4"
                  inputmode="numeric"
                />
              </div>
            </div>
          </div>

          <div *ngIf="metodoPago === 'PSE'">
            <div class="section-head">
              <span class="brand-chip pse">PSE</span>
              <span class="section-text">Pago Seguro en Línea</span>
            </div>

            <label>Banco</label>
            <select [(ngModel)]="pseBank">
              <option value="">Selecciona un banco</option>
              <option value="Bancolombia">Bancolombia</option>
              <option value="Davivienda">Davivienda</option>
              <option value="Banco de Bogotá">Banco de Bogotá</option>
            </select>

            <label>Documento</label>
            <input
              type="text"
              [(ngModel)]="pseDocument"
              (input)="onPseDocumentInput()"
              placeholder="Número de documento"
              inputmode="numeric"
            />

            <label>Tipo de persona</label>
            <select [(ngModel)]="psePersonType">
              <option value="Natural">Natural</option>
              <option value="Jurídica">Jurídica</option>
            </select>
          </div>

          <div *ngIf="metodoPago === 'NEQUI'">
            <div class="section-head">
              <span class="brand-chip nequi">Nequi</span>
              <span class="section-text">Pago con billetera digital</span>
            </div>

            <label>Número celular</label>
            <input
              type="text"
              [(ngModel)]="nequiPhone"
              (input)="onNequiPhoneInput()"
              placeholder="Número asociado a tu cuenta"
              maxlength="10"
              inputmode="numeric"
            />
          </div>
        </div>

        <div class="actions" *ngIf="pago.estado === 'PENDIENTE'">
          <button class="pay-btn" (click)="pagar()" [disabled]="processing">
            {{ processing ? 'Procesando...' : 'Pagar' }}
          </button>

          <div class="secondary-actions">
            <button class="ghost" (click)="volverEvento()" [disabled]="processing">
              Volver al evento
            </button>

            <button class="danger-outline" (click)="cancelarPago()" [disabled]="processing">
              Cancelar pago
            </button>
          </div>
        </div>

        <div class="actions" *ngIf="pago.estado !== 'PENDIENTE'">
          <button class="pay-btn" (click)="volverEvento()">Volver al evento</button>
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
      padding: 24px;
      background:
        radial-gradient(circle at top left, rgba(232, 169, 47, 0.10), transparent 24%),
        radial-gradient(circle at top right, rgba(143, 106, 168, 0.08), transparent 18%),
        linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      transition: background 0.3s ease;
    }

    .card {
      width: 100%;
      max-width: 720px;
      background: color-mix(in srgb, var(--bg-card) 88%, transparent);
      border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
      border-radius: 28px;
      box-shadow: var(--shadow-hover);
      backdrop-filter: blur(10px);
      padding: 28px;
      color: var(--text-primary);
      transition:
        background-color 0.3s ease,
        border-color 0.3s ease,
        color 0.3s ease,
        box-shadow 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 22px;
    }

    .eyebrow {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-yellow);
    }

    h1, h2 {
      margin: 0 0 8px;
      color: var(--text-primary);
    }

    .muted {
      color: var(--text-secondary);
      margin: 0;
    }

    .secure-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: color-mix(in srgb, var(--accent-yellow) 14%, var(--bg-card));
      color: var(--text-primary);
      border: 1px solid color-mix(in srgb, var(--accent-yellow) 28%, var(--border-color));
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
    }

    .resume {
      background: color-mix(in srgb, var(--bg-secondary) 78%, var(--bg-card));
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .resume-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .resume-row:last-child {
      border-bottom: none;
    }

    .resume-row span {
      color: var(--text-secondary);
    }

    .resume-row.total {
      font-size: 18px;
    }

    .status-paid { color: #2e8b57; }
    .status-rejected { color: #c23b22; }
    .status-cancelled { color: #c97a00; }
    .status-pending { color: var(--accent-yellow); }

    .method-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .method-card {
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      border-radius: 20px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: all .22s ease;
      box-shadow: var(--shadow);
    }

    .method-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
    }

    .method-card.active {
      border-color: color-mix(in srgb, var(--accent-yellow) 65%, var(--border-color));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-yellow) 18%, transparent);
      background: color-mix(in srgb, var(--accent-purple) 55%, var(--bg-card));
    }

    .method-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .method-title {
      font-weight: 800;
      color: var(--text-primary);
    }

    .radio-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--text-light);
      display: inline-block;
      position: relative;
      flex: 0 0 16px;
    }

    .radio-dot.checked {
      border-color: var(--accent-yellow);
    }

    .radio-dot.checked::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-yellow);
      top: 2px;
      left: 2px;
    }

    .brand-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .brand-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 56px;
      height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: white;
    }

    .brand-chip.small {
      min-width: 48px;
      height: 24px;
      font-size: 11px;
    }

    .visa {
      background: linear-gradient(135deg, #173248, #2f5d79);
    }

    .mastercard {
      background: linear-gradient(135deg, var(--accent-orange), var(--accent-red));
    }

    .pse {
      background: linear-gradient(135deg, #1b6e6a, #2a9d8f);
    }

    .nequi {
      background: linear-gradient(135deg, #8f6aa8, var(--accent-pink));
    }

    .brand-sub {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .form-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 22px;
      padding: 18px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
    }

    .card-visual {
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.15), transparent 28%),
        linear-gradient(135deg, #173248, #2b5876 55%, #8f6aa8);
      color: white;
      border-radius: 22px;
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: 0 14px 28px rgba(23, 50, 72, 0.22);
    }

    .card-visual-top,
    .card-visual-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chip {
      width: 42px;
      height: 30px;
      border-radius: 8px;
      background: linear-gradient(135deg, #fde68a, #f59e0b);
      display: inline-block;
    }

    .card-number-preview {
      margin: 22px 0 18px;
      font-size: 24px;
      letter-spacing: 0.08em;
      font-weight: 800;
    }

    .preview-label {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.72);
    }

    .section-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }

    .section-text {
      font-weight: 700;
      color: var(--text-primary);
    }

    label {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      margin-top: 10px;
      margin-bottom: 6px;
      display: block;
    }

    input,
    select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      box-sizing: border-box;
      font-size: 15px;
      transition:
        border-color .2s ease,
        box-shadow .2s ease,
        background-color .2s ease,
        color .2s ease;
    }

    input::placeholder {
      color: var(--text-light);
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--accent-yellow) 75%, var(--border-color));
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-yellow) 14%, transparent);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .actions {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }

    .secondary-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    button {
      border: none;
      border-radius: 18px;
      padding: 13px 16px;
      font-weight: 800;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .pay-btn {
      background: linear-gradient(135deg, var(--accent-yellow), #d8991f);
      color: #1a1a1a;
      box-shadow: 0 10px 22px rgba(232, 169, 47, 0.22);
    }

    .ghost {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .danger-outline {
      background: transparent;
      color: var(--accent-red);
      border: 1px solid color-mix(in srgb, var(--accent-red) 36%, var(--border-color));
    }

    button:disabled {
      opacity: .7;
      cursor: not-allowed;
      transform: none;
    }

    :host-context(.dark) .wrap {
      background:
        radial-gradient(circle at top left, rgba(212, 148, 26, 0.10), transparent 24%),
        radial-gradient(circle at top right, rgba(143, 106, 168, 0.10), transparent 18%),
        linear-gradient(180deg, #181818 0%, #121212 100%);
    }

    :host-context(.dark) .card {
      background: rgba(38, 38, 38, 0.88);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: var(--shadow-hover);
    }

    :host-context(.dark) .method-card.active {
      background: rgba(143, 106, 168, 0.18);
      box-shadow: 0 0 0 3px rgba(212, 148, 26, 0.10);
    }

    :host-context(.dark) .card-visual {
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.10), transparent 28%),
        linear-gradient(135deg, #112536, #173248 55%, #6f4d82);
    }

    @media (max-width: 720px) {
      .header {
        flex-direction: column;
      }

      .method-grid {
        grid-template-columns: 1fr;
      }

      .secondary-actions,
      .row {
        grid-template-columns: 1fr;
      }

      .card-number-preview {
        font-size: 20px;
      }
    }
  `]
})
export class PaymentSimulatorComponent implements OnInit {
  loading = true;
  processing = false;
  errorMsg = '';
  pago: PagoDetalleResponse | null = null;
  metodoPago: 'TARJETA' | 'PSE' | 'NEQUI' = 'TARJETA';

  cardNumber = '';
  cardHolder = '';
  cardExpiry = '';
  cardCvv = '';

  pseBank = '';
  pseDocument = '';
  psePersonType = 'Natural';

  nequiPhone = '';

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

  seleccionarMetodo(metodo: 'TARJETA' | 'PSE' | 'NEQUI'): void {
    this.metodoPago = metodo;
    this.resetForm();
  }

  resetForm(): void {
    this.cardNumber = '';
    this.cardHolder = '';
    this.cardExpiry = '';
    this.cardCvv = '';

    this.pseBank = '';
    this.pseDocument = '';
    this.psePersonType = 'Natural';

    this.nequiPhone = '';
  }

  onCardNumberInput(): void {
    const digits = this.cardNumber.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  onCardExpiryInput(): void {
    const digits = this.cardExpiry.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      this.cardExpiry = digits;
      return;
    }
    this.cardExpiry = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  onCardCvvInput(): void {
    this.cardCvv = this.cardCvv.replace(/\D/g, '').slice(0, 4);
  }

  onPseDocumentInput(): void {
    this.pseDocument = this.pseDocument.replace(/\D/g, '').slice(0, 20);
  }

  onNequiPhoneInput(): void {
    this.nequiPhone = this.nequiPhone.replace(/\D/g, '').slice(0, 10);
  }

  pagar(): void {
    if (!this.pago?.idPago) return;

    const validationError = this.validarFormulario();
    if (validationError) {
      ParchaSwal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: validationError,
        confirmButtonText: 'Ok'
      });
      return;
    }

    const resultado = this.calcularResultado();

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
          ParchaSwal.fire({
            icon: 'success',
            title: 'Pago aprobado',
            text: 'Tu inscripción fue confirmada correctamente.'
          }).then(() => this.volverEvento());
          return;
        }

        ParchaSwal.fire({
          icon: 'error',
          title: 'Pago rechazado',
          text: 'No fue posible aprobar el pago con la información ingresada.'
        });
      },
      error: (err) => {
        this.processing = false;

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.error ||
          'No se pudo procesar el pago.';

        ParchaSwal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonText: 'Ok'
        });
      }
    });
  }

  cancelarPago(): void {
    if (!this.pago?.idPago) return;

    ParchaSwal.fire({
      icon: 'warning',
      title: '¿Cancelar pago?',
      text: 'El pago quedará marcado como cancelado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar pago',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.processing = true;

      this.pagoService.simularPago(this.pago!.idPago, {
        metodoPago: this.metodoPago,
        resultado: 'CANCELADO'
      }).subscribe({
        next: (resp) => {
          this.processing = false;

          if (this.pago) {
            this.pago.estado = resp?.estado || 'CANCELADO';
            this.pago.metodoPago = resp?.metodoPago || this.metodoPago;
          }

          ParchaSwal.fire({
            icon: 'info',
            title: 'Pago cancelado',
            text: 'El pago fue cancelado correctamente.'
          }).then(() => this.volverEvento());
        },
        error: (err) => {
          this.processing = false;

          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.error ||
            'No se pudo cancelar el pago.';

          ParchaSwal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonText: 'Ok'
          });
        }
      });
    });
  }

  private validarFormulario(): string | null {
    if (this.metodoPago === 'TARJETA') {
      if (!this.cardNumber.trim()) return 'Ingresa el número de tarjeta.';
      if (this.cardNumber.replace(/\s/g, '').length < 16) return 'El número de tarjeta no es válido.';
      if (!this.cardHolder.trim()) return 'Ingresa el nombre del titular.';
      if (!this.cardExpiry.trim()) return 'Ingresa la fecha de vencimiento.';
      if (this.cardExpiry.length !== 5) return 'La fecha de vencimiento no es válida.';
      if (!this.cardCvv.trim()) return 'Ingresa el CVV.';
      if (this.cardCvv.length < 3) return 'El CVV no es válido.';
      return null;
    }

    if (this.metodoPago === 'PSE') {
      if (!this.pseBank.trim()) return 'Selecciona un banco.';
      if (!this.pseDocument.trim()) return 'Ingresa el documento.';
      if (!this.psePersonType.trim()) return 'Selecciona el tipo de persona.';
      return null;
    }

    if (this.metodoPago === 'NEQUI') {
      if (!this.nequiPhone.trim()) return 'Ingresa el número de celular.';
      if (this.nequiPhone.length !== 10) return 'El número de celular no es válido.';
      return null;
    }

    return null;
  }

  private calcularResultado(): 'PAGADO' | 'RECHAZADO' {
    if (this.metodoPago === 'TARJETA') {
      const card = this.cardNumber.replace(/\s+/g, '');

      if (
        card === '4242424242424242' &&
        this.cardExpiry.trim() === '12/30' &&
        this.cardCvv.trim() === '123'
      ) {
        return 'PAGADO';
      }

      if (
        card === '4000000000000002' &&
        this.cardExpiry.trim() === '12/30' &&
        this.cardCvv.trim() === '123'
      ) {
        return 'RECHAZADO';
      }

      return 'RECHAZADO';
    }

    if (this.metodoPago === 'NEQUI') {
      const phone = this.nequiPhone.trim();

      if (phone === '3001234567') return 'PAGADO';
      if (phone === '3000000000') return 'RECHAZADO';

      return 'RECHAZADO';
    }

    if (this.metodoPago === 'PSE') {
      const bank = this.pseBank.trim().toLowerCase();
      const doc = this.pseDocument.trim();

      if (bank === 'bancolombia' && doc === '11111111') return 'PAGADO';
      if (bank === 'davivienda' && doc === '99999999') return 'RECHAZADO';

      return 'RECHAZADO';
    }

    return 'RECHAZADO';
  }

  statusClass(estado?: string | null): string {
    const value = String(estado || '').toUpperCase();

    if (value === 'PAGADO') return 'status-paid';
    if (value === 'RECHAZADO') return 'status-rejected';
    if (value === 'CANCELADO') return 'status-cancelled';
    return 'status-pending';
  }

  volverEvento(): void {
    if (!this.pago?.eventoId) {
      this.router.navigate(['/explore']);
      return;
    }

    this.router.navigate(['/event', this.pago.eventoId]);
  }
}
