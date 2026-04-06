import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { AuthService, UserData } from './auth.service';

export interface AssistantOption {
  id: string;
  label: string;
  message?: string | null;
  value?: any;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  text: string;
  options?: AssistantOption[];
}

export interface AssistantConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class AssistantStateService {
  private readonly STORAGE_PREFIX = 'parchaface_assistant_conversations';
  private readonly LOGIN_SESSION_PREFIX = 'parchaface_assistant_active_login';
  private readonly MAX_MESSAGES = 60;

  private readonly _isOpen = new BehaviorSubject<boolean>(false);
  private readonly _isLoading = new BehaviorSubject<boolean>(false);
  private readonly _conversations = new BehaviorSubject<AssistantConversation[]>([]);
  private readonly _currentConversationId = new BehaviorSubject<string | null>(null);

  private ownerKey = 'guest';
  private wasLoggedIn = false;

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    combineLatest([this.authService.isLoggedIn$, this.authService.userData$]).subscribe(
      ([isLoggedIn, user]) => {
        this.handleAuthChange(isLoggedIn, user);
      }
    );
  }

  get isOpen(): boolean {
    return this._isOpen.value;
  }

  get isLoading(): boolean {
    return this._isLoading.value;
  }

  get conversations(): AssistantConversation[] {
    return this._conversations.value;
  }

  get currentConversationId(): string | null {
    return this._currentConversationId.value;
  }

  get currentConversation(): AssistantConversation | null {
    return (
      this._conversations.value.find((c) => c.id === this._currentConversationId.value) ?? null
    );
  }

  get messages(): AssistantMessage[] {
    return this.currentConversation?.messages ?? [];
  }

  open(): void {
    this._isOpen.next(true);
  }

  close(): void {
    this._isOpen.next(false);
  }

  toggle(): void {
    this._isOpen.next(!this._isOpen.value);
  }

  setLoading(value: boolean): void {
    this._isLoading.next(value);
  }

  startNewConversation(): void {
    const current = this._conversations.value;
    const number = current.length + 1;
    const now = new Date().toISOString();

    const newConversation: AssistantConversation = {
      id: this.generateId(),
      title: `Conversación ${number}`,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: 'assistant',
          text:
            'Hola, soy ParchaBot. Puedo ayudarte a encontrar eventos, recomendarte según tus gustos, armar planes, orientarte con transporte y explicarte cómo funciona ParchaFace.'
        }
      ]
    };

    const next = [newConversation, ...current];
    this._conversations.next(next);
    this._currentConversationId.next(newConversation.id);
    this.persistConversations();
    this.persistActiveLoginConversationId(newConversation.id);
  }

  selectConversation(conversationId: string): void {
    const exists = this._conversations.value.some((c) => c.id === conversationId);
    if (!exists) return;

    this._currentConversationId.next(conversationId);
    this.persistActiveLoginConversationId(conversationId);
  }

  deleteConversation(conversationId: string): void {
    const current = this._conversations.value;
    const filtered = current.filter((conversation) => conversation.id !== conversationId);

    if (filtered.length === current.length) return;

    this._conversations.next(filtered);

    if (this._currentConversationId.value === conversationId) {
      if (filtered.length > 0) {
        this._currentConversationId.next(filtered[0].id);
        this.persistActiveLoginConversationId(filtered[0].id);
      } else {
        this._currentConversationId.next(null);

        if (this.isBrowser() && this.ownerKey.startsWith('user:')) {
          sessionStorage.removeItem(this.loginSessionKey(this.ownerKey));
        }
      }
    }

    this.persistConversations();
  }

  addMessage(message: AssistantMessage): void {
    const current = this.currentConversation;
    if (!current) return;

    const nextMessages = [...current.messages, message].slice(-this.MAX_MESSAGES);

    const updatedConversation: AssistantConversation = {
      ...current,
      updatedAt: new Date().toISOString(),
      messages: nextMessages
    };

    const next = this._conversations.value.map((conversation) =>
      conversation.id === current.id ? updatedConversation : conversation
    );

    this._conversations.next(next);
    this.persistConversations();
  }

  clearCurrentConversation(): void {
    const current = this.currentConversation;
    if (!current) return;

    const resetConversation: AssistantConversation = {
      ...current,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: 'assistant',
          text:
            'Hola, soy Parchi. Empezamos de nuevo. Puedo ayudarte con eventos, planes, pagos, términos, privacidad y rutas dentro de ParchaFace.'
        }
      ]
    };

    const next = this._conversations.value.map((conversation) =>
      conversation.id === current.id ? resetConversation : conversation
    );

    this._conversations.next(next);
    this.persistConversations();
  }

  private handleAuthChange(isLoggedIn: boolean, user: UserData | null): void {
    if (!this.isBrowser()) return;

    if (!isLoggedIn) {
      if (this.wasLoggedIn && this.ownerKey.startsWith('user:')) {
        sessionStorage.removeItem(this.loginSessionKey(this.ownerKey));
      }

      this.ownerKey = 'guest';
      this.wasLoggedIn = false;
      this._conversations.next([]);
      this._currentConversationId.next(null);
      this._isOpen.next(false);
      return;
    }

    const nextOwnerKey = this.buildOwnerKey(user);

    if (nextOwnerKey !== this.ownerKey) {
      this.persistConversations();
      this.ownerKey = nextOwnerKey;
    }

    this.wasLoggedIn = true;

    // Carga el historial del usuario, pero arranca SIN conversación activa.
    const saved = this.readStoredConversations();
    this._conversations.next(saved);
    this._currentConversationId.next(null);
    this._isOpen.next(false);

    if (this.ownerKey.startsWith('user:')) {
      sessionStorage.removeItem(this.loginSessionKey(this.ownerKey));
    }
  }

  private loadOwnerConversations(): void {
    const saved = this.readStoredConversations();
    this._conversations.next(saved);

    const loginKey = this.loginSessionKey(this.ownerKey);
    const activeConversationId = sessionStorage.getItem(loginKey);

    if (
      activeConversationId &&
      saved.some((conversation) => conversation.id === activeConversationId)
    ) {
      this._currentConversationId.next(activeConversationId);
      return;
    }

    if (saved.length > 0) {
      this._currentConversationId.next(saved[0].id);
      this.persistActiveLoginConversationId(saved[0].id);
      return;
    }

    this._currentConversationId.next(null);

    if (this.isBrowser() && this.ownerKey.startsWith('user:')) {
      sessionStorage.removeItem(loginKey);
    }
  }

  private readStoredConversations(): AssistantConversation[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is AssistantConversation =>
          item &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages)
      );
    } catch (error) {
      console.error('No se pudieron leer las conversaciones del asistente:', error);
      return [];
    }
  }

  private persistConversations(): void {
    if (!this.isBrowser() || !this.ownerKey.startsWith('user:')) return;

    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this._conversations.value));
    } catch (error) {
      console.error('No se pudieron guardar las conversaciones del asistente:', error);
    }
  }

  private persistActiveLoginConversationId(conversationId: string): void {
    if (!this.isBrowser() || !this.ownerKey.startsWith('user:')) return;

    sessionStorage.setItem(this.loginSessionKey(this.ownerKey), conversationId);
  }

  private buildOwnerKey(user: UserData | null): string {
    const correo = (user?.correo ?? '').trim().toLowerCase();
    if (correo) return `user:${correo}`;

    const idUsuario = user?.idUsuario ?? user?.id;
    if (idUsuario != null) return `user:${idUsuario}`;

    return 'guest';
  }

  private storageKey(): string {
    return `${this.STORAGE_PREFIX}:${this.ownerKey}`;
  }

  private loginSessionKey(ownerKey: string): string {
    return `${this.LOGIN_SESSION_PREFIX}:${ownerKey}`;
  }

  private generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
