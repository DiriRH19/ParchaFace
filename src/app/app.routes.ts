import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExploreComponent } from './explore/explore.component';
import { CommunityComponent } from './community/community.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ProfileComponent } from './profile/profile.component';
import { CreateEventComponent } from './create-event/create-event.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { authGuard } from './guards/auth.guard';

import { ForgotPasswordComponent } from './password-reset/forgot-password/forgot-password';
import { VerifyCodeComponent } from './password-reset/verify-code/verify-code';
import { NewPasswordComponent } from './password-reset/new-password/new-password';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'explore', component: ExploreComponent },
  { path: 'community', component: CommunityComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'create-event', component: CreateEventComponent, canActivate: [authGuard] },
  { path: 'event/:id', component: EventDetailComponent },

  // ✅ Password reset
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-code', component: VerifyCodeComponent },
  { path: 'new-password', component: NewPasswordComponent },

  // ✅ SIEMPRE de último
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
