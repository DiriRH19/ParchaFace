import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { ExploreComponent } from './explore/explore.component';
import { CommunityComponent } from './community/community.component';
import { DiscussionsComponent } from './community/discussions/discussions.component';
import { DiscussionDetailComponent } from './community/discussion-detail/discussion-detail.component';
import { CreatePostComponent } from './community/create-post/create-post.component';

import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { PreferenciasComponent } from './preferencias/preferencias';
import { ProfileComponent } from './profile/profile.component';
import { CreateEventComponent } from './create-event/create-event.component';
import { EventDetailComponent } from './event-detail/event-detail.component';

import { authGuard } from './guards/auth.guard';

import { ForgotPasswordComponent } from './password-reset/forgot-password/forgot-password';
import { VerifyCodeComponent } from './password-reset/verify-code/verify-code';
import { NewPasswordComponent } from './password-reset/new-password/new-password';

export const routes: Routes = [
  // Home principal visual
  { path: '', component: ExploreComponent },
  { path: 'explore', component: ExploreComponent },

  // Mapa
  { path: 'mapa', component: HomeComponent },

  {
    path: 'usuarios/:id',
    loadComponent: () =>
      import('./user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },

  // Comunidad
  { path: 'community', component: CommunityComponent },
  { path: 'community/discussions', component: DiscussionsComponent },
  { path: 'community/discussions/:id', component: DiscussionDetailComponent },
  { path: 'community/create-post', component: CreatePostComponent, canActivate: [authGuard] },

  // Auth
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Privadas
  { path: 'preferencias', component: PreferenciasComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'create-event', component: CreateEventComponent, canActivate: [authGuard] },

  // Eventos
  { path: 'event/:id', component: EventDetailComponent },

  // Password reset
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-code', component: VerifyCodeComponent },
  { path: 'new-password', component: NewPasswordComponent },

  // Wildcard
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
