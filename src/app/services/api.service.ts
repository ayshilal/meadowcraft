import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}/${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}/${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: unknown) {
    console.error('API Error:', error);
    return throwError(() => error);
  }
}
