import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;

  // Evitar acceder a localStorage en entornos sin window (SSR)
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      token = localStorage.getItem('token') || localStorage.getItem('jwt') || null;
    }
  } catch (e) {
    token = null;
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
