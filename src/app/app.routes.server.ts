import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },
  { path: 'verify-code', renderMode: RenderMode.Prerender },
  { path: 'new-password', renderMode: RenderMode.Prerender },

  { path: 'explore', renderMode: RenderMode.Server },
  { path: 'event/:id', renderMode: RenderMode.Server },

  { path: 'community', renderMode: RenderMode.Server },
  { path: 'community/discussions', renderMode: RenderMode.Server },
  { path: 'community/discussions/:id', renderMode: RenderMode.Server },
  { path: 'community/create-post', renderMode: RenderMode.Server },

  { path: 'preferencias', renderMode: RenderMode.Server },
  { path: 'profile', renderMode: RenderMode.Server },
  { path: 'create-event', renderMode: RenderMode.Server },

  { path: '**', renderMode: RenderMode.Server },
];