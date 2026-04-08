import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import {
  AssistantPageContext,
  AssistantRequest,
  AssistantResponse,
  AssistantService
} from '../../services/assistant.service';
import {
  AssistantConversation,
  AssistantMessage,
  AssistantOption,
  AssistantStateService
} from '../../services/assistant-state.service';
import {
  AssistantAction,
  AssistantActionsService
} from '../../services/assistant-actions.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-assistant-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-bubble.html',
  styleUrl: './assistant-bubble.css'
})
export class AssistantBubbleComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer')
  private messagesContainer?: ElementRef<HTMLDivElement>;

  @ViewChildren('eye')
  private eyeRefs?: QueryList<ElementRef<HTMLSpanElement>>;

  @ViewChildren('pupil')
  private pupilRefs?: QueryList<ElementRef<HTMLSpanElement>>;

  draft = '';
  isLoggedIn = false;

  private userLat: number | null = null;
  private userLng: number | null = null;
  private geolocationRequested = false;
  private authSubscription?: Subscription;
  private eyeChangesSubscription?: Subscription;

  private readonly blockedTerms: string[] = [
    'hp', 'hpta', 'hptas',
    'hijueputa', 'hijo de puta', 'hija de puta', 'jueputa',
    'puta', 'puto', 'putita', 'putito',
    'gonorrea', 'gono',
    'carechimba', 'caremonda',
    'malparido', 'malparida',
    'marica', 'maricon', 'marik', 'mariquita',
    'pendejo', 'pendeja',
    'cabron', 'cabrona',
    'huevon', 'huevona', 'wevon', 'webon', 'guevon',
    'culero', 'culera', 'culiado', 'culiada',
    'mierda', 'mierdoso', 'mierdosa',
    'imbecil', 'idiota', 'estupido', 'tarado',
    'mamaguevo', 'mamahuevo', 'comemierda',
    'pirobo', 'zorra', 'perra',
    'coño', 'carajo',
    'chingar', 'chingada', 'chingado', 'pinche',
    'pelotudo', 'pelotuda',
    'boludo', 'boluda',
    'verga',

    'fuck', 'fucking', 'fucker', 'motherfucker',
    'shit', 'bullshit',
    'asshole', 'bitch', 'son of a bitch',
    'bastard', 'slut', 'whore',
    'dick', 'cock', 'pussy', 'cunt',
    'retard', 'dumbass', 'jackass', 'piece of shit'
  ];

  constructor(
    public state: AssistantStateService,
    private assistantService: AssistantService,
    private assistantActions: AssistantActionsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isLoggedIn$.subscribe((value) => {
      this.isLoggedIn = value;

      if (!value) {
        this.state.close();
        this.userLat = null;
        this.userLng = null;
        this.geolocationRequested = false;
        this.resetEyes();
        return;
      }

      this.tryRequestUserLocation();
    });
  }

  ngAfterViewInit(): void {
    this.resetEyes();

    this.eyeChangesSubscription = this.eyeRefs?.changes.subscribe(() => {
      this.resetEyes();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.eyeChangesSubscription?.unsubscribe();
  }

  toggle(): void {
    if (!this.isLoggedIn) return;

    if (!this.state.currentConversationId) {
      this.state.startNewConversation();
    }

    this.state.toggle();

    if (this.state.isOpen) {
      this.scrollMessagesToBottom();
    } else {
      this.resetEyes();
    }
  }

  close(): void {
    this.state.close();
    this.resetEyes();
  }

  newConversation(): void {
    this.state.startNewConversation();
    this.scrollMessagesToBottom();
  }

  openConversation(conversationId: string): void {
    this.state.selectConversation(conversationId);
    this.scrollMessagesToBottom();
  }

  deleteConversation(event: MouseEvent, conversationId: string): void {
    event.stopPropagation();
    this.state.deleteConversation(conversationId);
    this.scrollMessagesToBottom();
  }

  clearCurrentConversation(): void {
    this.state.clearCurrentConversation();
    this.scrollMessagesToBottom();
  }

  async sendCurrentMessage(): Promise<void> {
    const text = this.draft.trim();

    if (!text || this.state.isLoading) {
      return;
    }

    this.ensureConversation();

    if (this.containsBlockedLanguage(text)) {
      this.draft = '';
      this.state.addMessage({
        role: 'assistant',
        text: 'Ese mensaje contiene lenguaje inapropiado. Por favor escríbelo de otra forma.'
      });
      this.scrollMessagesToBottom();
      return;
    }

    this.draft = '';
    await this.sendMessageInternal(text);
  }

  async onOptionClick(option: AssistantOption): Promise<void> {
    if (this.state.isLoading) {
      return;
    }

    this.ensureConversation();

    const messageToSend = (option.message ?? '').trim() || option.label.trim();

    if (!messageToSend) {
      return;
    }

    if (this.containsBlockedLanguage(messageToSend)) {
      this.state.addMessage({
        role: 'assistant',
        text: 'Ese mensaje contiene lenguaje inapropiado. Por favor escríbelo de otra forma.'
      });
      this.scrollMessagesToBottom();
      return;
    }

    await this.sendMessageInternal(messageToSend);
  }

  trackByMessage(index: number, _item: AssistantMessage): number {
    return index;
  }

  trackByConversation(_index: number, conversation: AssistantConversation): string {
    return conversation.id;
  }

  formatConversationDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    const eyes = this.eyeRefs?.toArray() ?? [];
    const pupils = this.pupilRefs?.toArray() ?? [];

    if (!eyes.length || !pupils.length) {
      return;
    }

    for (let i = 0; i < Math.min(eyes.length, pupils.length); i++) {
      this.movePupilInsideEye(eyes[i].nativeElement, pupils[i].nativeElement, event);
    }
  }

  @HostListener('document:mouseleave')
  onDocumentMouseLeave(): void {
    this.resetEyes();
  }

  private movePupilInsideEye(
    eyeEl: HTMLSpanElement,
    pupilEl: HTMLSpanElement,
    event: MouseEvent
  ): void {
    const rect = eyeEl.getBoundingClientRect();

    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;

    const dx = event.clientX - eyeCenterX;
    const dy = event.clientY - eyeCenterY;

    const maxMoveX = 2.2;
    const maxMoveY = 2.6;

    const normalizedX = Math.max(-1, Math.min(1, dx / 120));
    const normalizedY = Math.max(-1, Math.min(1, dy / 120));

    const moveX = normalizedX * maxMoveX;
    const moveY = normalizedY * maxMoveY;

    pupilEl.style.transform = `translate(${moveX}px, ${moveY}px)`;
  }

  private tryRequestUserLocation(): void {
    if (this.geolocationRequested) return;
    if (!('geolocation' in navigator)) return;

    this.geolocationRequested = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLat = position.coords.latitude;
        this.userLng = position.coords.longitude;
      },
      (error) => {
        console.warn('No se pudo obtener la ubicación del usuario:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000
      }
    );
  }

  private buildSessionId(): string {
    const key = 'parchaface_assistant_session_id';
    const existing = localStorage.getItem(key);

    if (existing) {
      return existing;
    }

    const generated =
      'sess-' + Math.random().toString(36).slice(2) + '-' + Date.now();

    localStorage.setItem(key, generated);
    return generated;
  }

  private buildPageContext(): AssistantPageContext {
    return {
      userLat: this.userLat,
      userLng: this.userLng,
      currentView: this.router.url
    };
  }

  private buildRequest(message: string): AssistantRequest {
    return {
      message,
      sessionId: this.buildSessionId(),
      conversationId: this.state.currentConversationId!,
      currentRoute: this.router.url,
      history: this.state.messages.map((m: AssistantMessage) => ({
        role: m.role,
        text: m.text
      })),
      pageContext: this.buildPageContext()
    };
  }

  private async sendMessageInternal(message: string): Promise<void> {
    this.ensureConversation();

    this.state.addMessage({
      role: 'user',
      text: message
    });

    this.scrollMessagesToBottom();

    this.state.setLoading(true);
    this.state.open();

    try {
      const payload: AssistantRequest = this.buildRequest(message);

      const response: AssistantResponse = await firstValueFrom(
        this.assistantService.sendMessage(payload)
      );

      this.state.addMessage({
        role: 'assistant',
        text: response.reply || 'No pude responder en este momento.',
        options: (response.options || []).map((option) => ({
          ...option,
          message: option.message ?? undefined
        }))
      });

      this.scrollMessagesToBottom();

      await this.executeResponseActions(response.actions || []);
    } catch (error) {
      console.error('Error enviando mensaje al asistente:', error);

      this.state.addMessage({
        role: 'assistant',
        text: 'Tuve un problema conectándome con el asistente. Revisa si el backend está encendido.'
      });

      this.scrollMessagesToBottom();
    } finally {
      this.state.setLoading(false);
    }
  }

  private async executeResponseActions(actions: AssistantAction[]): Promise<void> {
    if (!actions.length) {
      return;
    }

    const pendingForService: AssistantAction[] = [];

    for (const action of actions) {
      const type = this.readActionType(action);

      if (type === 'navigate') {
        const route = this.readRoute(action);
        const query = action.query && typeof action.query === 'object'
          ? action.query
          : null;

        if (route) {
          try {
            if (query && Object.keys(query).length > 0) {
              const urlTree = this.router.parseUrl(route);
              urlTree.queryParams = {
                ...urlTree.queryParams,
                ...query
              };
              await this.router.navigateByUrl(urlTree);
            } else {
              await this.router.navigateByUrl(route);
            }
            continue;
          } catch (error) {
            console.error('Error navegando desde assistant bubble:', error, route, query);
          }
        }
      }

      if (type === 'scroll') {
        const targetId = this.readTargetId(action);

        if (targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            continue;
          }
        }
      }

      pendingForService.push(action);
    }

    if (pendingForService.length) {
      await this.assistantActions.executeAll(pendingForService);
    }
  }

  private readActionType(action: AssistantAction): string {
    return typeof action.type === 'string' ? action.type.trim().toLowerCase() : '';
  }

  private readRoute(action: AssistantAction): string | null {
    return typeof action.route === 'string' && action.route.trim()
      ? action.route.trim()
      : null;
  }

  private readTargetId(action: AssistantAction): string | null {
    return typeof action.targetId === 'string' && action.targetId.trim()
      ? action.targetId.trim()
      : null;
  }

  private containsBlockedLanguage(text: string): boolean {
    const normalized = this.normalizeForModeration(text);

    return this.blockedTerms.some((term) => {
      const normalizedTerm = this.normalizeForModeration(term);
      const pattern = new RegExp(`(^|\\s)${this.escapeRegExp(normalizedTerm)}(\\s|$)`, 'i');
      return pattern.test(normalized);
    });
  }

  private normalizeForModeration(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[0]/g, 'o')
      .replace(/[@]/g, 'a')
      .replace(/[1!|]/g, 'i')
      .replace(/[3]/g, 'e')
      .replace(/[4]/g, 'a')
      .replace(/[5$]/g, 's')
      .replace(/[7]/g, 't')
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private scrollMessagesToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 50);
  }

  private ensureConversation(): void {
    if (!this.state.currentConversationId) {
      this.state.startNewConversation();
    }
  }

  private resetEyes(): void {
    const pupils = this.pupilRefs?.toArray() ?? [];
    for (const pupil of pupils) {
      pupil.nativeElement.style.transform = 'translate(0px, 0px)';
    }
  }
}