import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastUiComponent } from './shared/toast/toast-ui/toast-ui';
import { ThemeService } from './services/theme.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastUiComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.initTheme();
  }
}
