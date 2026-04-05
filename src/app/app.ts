import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastUiComponent } from './shared/toast/toast-ui/toast-ui';
import { ThemeService } from './services/theme.service';
import {AssistantBubbleComponent} from './assistant/assistant-bubble/assistant-bubble';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastUiComponent, AssistantBubbleComponent, AssistantBubbleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.initTheme();
  }
}
