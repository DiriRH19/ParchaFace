import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private state = new BehaviorSubject<ToastState>({
    show: false,
    message: '',
    type: 'info'
  });

  toast$ = this.state.asObservable();

  show(message: string, type: ToastType = 'info', ms = 2500) {
    this.state.next({ show: true, message, type });
    setTimeout(() => this.hide(), ms);
  }

  hide() {
    this.state.next({ show: false, message: '', type: 'info' });
  }
}
