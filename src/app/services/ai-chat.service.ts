import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model';
import { RoutineStep } from '../models/routine.model';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';

interface ChatApiRequest {
  message: string;
  routineType: string;
  steps: Array<{
    productName: string;
    brand: string;
    category: string;
    notes: string | null;
  }>;
  products: Array<{
    name: string;
    brand: string;
    category: string;
    description: string | null;
  }>;
  history: Array<{
    role: string;
    content: string;
  }>;
}

interface ChatApiResponse {
  response: string;
  sources: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  isConfigured(): boolean {
    return !!environment.apiUrl;
  }

  clearHistory(): void {}

  getGreeting(steps: RoutineStep[], routineType: string): ChatMessage {
    let content: string;
    if (steps.length === 0) {
      content = `Hello! I'm your AI dermatologist. I see you haven't added any steps to your ${routineType.toLowerCase()} routine yet. I'd love to help you build one! What's your skin type and what are your main skin concerns?`;
    } else {
      content = `Hello! I'm your AI dermatologist. I can see your ${routineType.toLowerCase()} routine has ${steps.length} step${steps.length !== 1 ? 's' : ''}. Feel free to ask me anything about your routine, product order, ingredient interactions, or recommendations for your skin concerns!`;
    }
    return { role: 'assistant', content, timestamp: new Date() };
  }

  sendMessage(
    userMessage: string,
    steps: RoutineStep[],
    routineType: string,
    products: Product[] = [],
    chatHistory: ChatMessage[] = []
  ): Observable<ChatMessage> {
    const body: ChatApiRequest = {
      message: userMessage,
      routineType,
      steps: steps.map(s => ({
        productName: s.product?.name || 'Unknown',
        brand: s.product?.brand || '',
        category: s.product?.category || '',
        notes: s.notes || null,
      })),
      products: products.map(p => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description || null,
      })),
      history: chatHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
    };

    return this.http.post<ChatApiResponse>(this.apiUrl, body).pipe(
      map((response) => ({
        role: 'assistant' as const,
        content: response.response,
        timestamp: new Date(),
      })),
      catchError((error) => {
        console.error('AI Chat Error:', error);
        return of({
          role: 'assistant' as const,
          content: 'I apologize, I encountered an issue connecting to the AI service. Please try again.',
          timestamp: new Date(),
        });
      })
    );
  }
}
