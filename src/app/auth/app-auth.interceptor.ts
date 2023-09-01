import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  private handleRequest(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (
          error.status === 401 &&
          error.error.error === 'Token Expired'
          // !req.url.includes('refresh-token') &&
          // !req.url.includes('register') &&
          // !req.url.includes('authenticate')
        ) {
          return this.authService.refreshAccessToken().pipe(
            switchMap(() => {
              const authToken = this.authService.getAccessToken();
              const authReq = req.clone({
                headers: req.headers.set(
                  'Authorization',
                  'Bearer ' + authToken
                ),
                withCredentials: true,
              });
              return this.handleRequest(authReq, next);
            }),
            catchError(() => {
              this.router.navigate(['/login']);
              this.snackBar.open('Session expired, please login again', '', {
                duration: 3000,
              });
              return throwError(() => new Error('something went wrong'));
            })
          );
        } else {
          return throwError(() => new Error(error));
        }
      })
    );
  }

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (
      // !req.url.includes('authenticate') &&
      // !req.url.includes('register') &&
      !req.url.includes('refresh-token')
    ) {
      const authToken = this.authService.getAccessToken();
      const authRequest = req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + authToken),
        withCredentials: true,
      });
      return this.handleRequest(authRequest, next);
    } else if (req.url.includes('refresh-token')) {
      const authToken = this.authService.getRefreshToken();
      const authRequest = req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + authToken),
        withCredentials: true,
      });
      return next.handle(authRequest).pipe(
        catchError(() => {
          this.router.navigate(['/login']);
          this.snackBar.open('Please login', '', {
            duration: 3000,
          });
          return throwError(() => new Error('something went wrong'));
        })
      );
    }

    return next.handle(req).pipe(
      catchError(() => {
        this.router.navigate(['/login']);
        this.snackBar.open('Please login', '', {
          duration: 3000,
        });
        return throwError(() => new Error('something went wrong'));
      })
    );
  }
}
