import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastUiComponent } from './shared/toast/toast-ui/toast-ui';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastUiComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
