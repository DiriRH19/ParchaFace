import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface AssistantAction {
  type: 'navigate' | 'scroll' | 'open_link';
  route?: string | null;
  query?: Record<string, any> | null;
  targetId?: string | null;
  url?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantActionsService {
  constructor(private router: Router) {}

  async execute(action: AssistantAction): Promise<void> {
    if (!action?.type) return;

    switch (action.type) {
      case 'navigate':
        if (!action.route) return;

        if (action.query && Object.keys(action.query).length > 0) {
          const urlTree = this.router.parseUrl(action.route);
          urlTree.queryParams = {
            ...urlTree.queryParams,
            ...action.query
          };
          await this.router.navigateByUrl(urlTree);
        } else {
          await this.router.navigateByUrl(action.route);
        }
        return;

      case 'scroll':
        if (!action.targetId) return;

        setTimeout(() => {
          const el = document.getElementById(action.targetId!);
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 250);
        return;

      case 'open_link':
        if (!action.url) return;
        window.open(action.url, '_blank', 'noopener,noreferrer');
        return;
    }
  }

  async executeAll(actions: AssistantAction[] | null | undefined): Promise<void> {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      await this.execute(action);
    }
  }
}
