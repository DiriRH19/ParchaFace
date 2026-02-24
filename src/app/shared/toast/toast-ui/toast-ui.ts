import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],   // ✅ esto es lo que habilita @if y async
  templateUrl: './toast-ui.html',
  styleUrls: ['./toast-ui.css']
})
export class ToastUiComponent {
  constructor(public toast: ToastService) {}
}
