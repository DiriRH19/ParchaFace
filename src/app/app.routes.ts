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
import { adminGuard } from './guards/admin.guard';
import { adminSessionOnlyGuard } from './guards/admin-session-only.guard';

import { ForgotPasswordComponent } from './password-reset/forgot-password/forgot-password';
import { VerifyCodeComponent } from './password-reset/verify-code/verify-code';
import { NewPasswordComponent } from './password-reset/new-password/new-password';

export const routes: Routes = [
  { path: '', component: ExploreComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'explore', component: ExploreComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'mapa', component: HomeComponent, canActivate: [adminSessionOnlyGuard] },

  {
    path: 'usuarios/:id',
    canActivate: [adminSessionOnlyGuard],
    loadComponent: () =>
      import('./user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },

  { path: 'community', component: CommunityComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'community/discussions', component: DiscussionsComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'community/discussions/:id', component: DiscussionDetailComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'community/create-post', component: CreatePostComponent, canActivate: [authGuard, adminSessionOnlyGuard] },

  { path: 'login', component: LoginComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [adminSessionOnlyGuard] },

  { path: 'preferencias', component: PreferenciasComponent, canActivate: [authGuard, adminSessionOnlyGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard, adminSessionOnlyGuard] },
  { path: 'create-event', component: CreateEventComponent, canActivate: [authGuard, adminSessionOnlyGuard] },
  { path: 'event/:id', component: EventDetailComponent, canActivate: [adminSessionOnlyGuard], data: { allowAdminSession: true } },

  {
    path: 'event/:id/inscritos',
    canActivate: [authGuard, adminSessionOnlyGuard],
    loadComponent: () =>
      import('./event-attendees/event-attendees.component').then(m => m.EventAttendeesComponent)
  },

  {
    path: 'pago/simulado/:idPago',
    canActivate: [authGuard, adminSessionOnlyGuard],
    loadComponent: () =>
      import('./payment-simulator/payment-simulator.component').then(m => m.PaymentSimulatorComponent)
  },

  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'verify-code', component: VerifyCodeComponent, canActivate: [adminSessionOnlyGuard] },
  { path: 'new-password', component: NewPasswordComponent, canActivate: [adminSessionOnlyGuard] },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
  },

  { path: '**', redirectTo: '', pathMatch: 'full' }
];