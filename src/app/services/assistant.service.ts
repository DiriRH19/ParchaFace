import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../config/api.config';
import { AssistantAction } from './assistant-actions.service';
import { AssistantOption } from './assistant-state.service';

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantPageContext {
  userLat?: number | null;
  userLng?: number | null;
  userLocationLabel?: string | null;
  currentView?: string | null;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
}

export interface AssistantRequest {
  message: string;
  sessionId: string;
  conversationId: string;
  currentRoute: string;
  history: AssistantHistoryItem[];
  pageContext?: AssistantPageContext | null;
}

export interface AssistantOptionResponse {
  id: string;
  label: string;
  message?: string | null;
  value?: any;
}

export interface AssistantResponse {
  reply: string;
  actions?: AssistantAction[];
  options?: AssistantOption[];
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private readonly apiUrl = buildApiUrl('/api/assistant/chat');

  constructor(private http: HttpClient) {}

  sendMessage(payload: AssistantRequest): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(this.apiUrl, payload);
  }
}
