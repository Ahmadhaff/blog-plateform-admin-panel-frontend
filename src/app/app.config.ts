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
        // Handle 401 Unauthorized - try to refresh token first
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          const refreshToken = authService.getRefreshToken();
          
          // If we have a refresh token, try to refresh
          if (refreshToken) {
            // For admin panel, we don't have a refresh endpoint yet
            // So just logout on 401
            console.error('❌ 401 Unauthorized - Session expired');
            authService.logout();
            return throwError(() => error);
          } else {
            // No refresh token - logout immediately
            console.error('❌ 401 Unauthorized - No refresh token available');
            authService.logout();
            return throwError(() => error);
          }
        }
        
        // Handle connection errors (ERR_CONNECTION_RESET, network errors)
        if (error.status === 0 || error.status === null) {
          console.error('❌ Network error or connection reset:', error);
          // Don't logout on network errors - might be temporary
          // Just return the error
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
