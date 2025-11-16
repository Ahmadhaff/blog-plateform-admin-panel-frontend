import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

// HTTP Interceptor to add authentication token and handle session expiration
const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Skip auth for login endpoint
  const skipAuth = req.url.includes('/auth/login');
  
  if (skipAuth) {
    return next(req);
  }

  // Add token to request if available
  const token = authService.getToken();
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest).pipe(
      catchError((error) => {
        // Handle 401 Unauthorized - session expired
        if (error.status === 401) {
          // Clear tokens and user data, then navigate to login
          authService.logout();
          return throwError(() => error);
        }
        return throwError(() => error);
      })
    );
  }

  // If no token, let request proceed (might be a public endpoint)
  // If it returns 401, it will be caught and handled above
  return next(req).pipe(
    catchError((error) => {
      // Handle 401 Unauthorized even for requests without tokens
      if (error.status === 401) {
        // Clear any existing tokens and navigate to login
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        router.navigate(['/login']);
        return throwError(() => error);
      }
      return throwError(() => error);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptorFn])
    )
  ]
};
