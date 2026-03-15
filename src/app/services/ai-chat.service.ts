import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model';
import { RoutineStep } from '../models/routine.model';
import { environment } from '../../environments/environment';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private apiUrl = 'https://api.anthropic.com/v1/messages';
  private conversationHistory: AnthropicMessage[] = [];

  constructor(private http: HttpClient) {}

  isConfigured(): boolean {
    return !!(environment as any).anthropicApiKey;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getGreeting(steps: RoutineStep[], routineType: string): ChatMessage {
    let content: string;
    if (steps.length === 0) {
      content = `Hello! I'm your AI dermatologist. I see you haven't added any steps to your ${routineType.toLowerCase()} routine yet. I'd love to help you build one! What's your skin type and what are your main skin concerns?`;
    } else {
      const productNames = steps.map(s => s.product?.name || 'Unknown').join(', ');
      content = `Hello! I'm your AI dermatologist. I can see your ${routineType.toLowerCase()} routine has ${steps.length} step${steps.length !== 1 ? 's' : ''}: ${productNames}. Feel free to ask me anything about your routine — product order, ingredient interactions, or recommendations for your skin concerns.`;
    }
    return { role: 'assistant', content, timestamp: new Date() };
  }

  sendMessage(
    userMessage: string,
    steps: RoutineStep[],
    routineType: string
  ): Observable<ChatMessage> {
    if (!this.isConfigured()) {
      return throwError(() => new Error('API key not configured'));
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const systemPrompt = this.buildSystemPrompt(steps, routineType);
    const apiKey = (environment as any).anthropicApiKey;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: this.conversationHistory,
    };

    return this.http.post<AnthropicResponse>(this.apiUrl, body, { headers }).pipe(
      map((response) => {
        const text = response.content[0]?.text || 'I apologize, I could not generate a response.';
        this.conversationHistory.push({ role: 'assistant', content: text });
        return {
          role: 'assistant' as const,
          content: text,
          timestamp: new Date(),
        };
      }),
      catchError((error) => {
        this.conversationHistory.pop();
        console.error('AI Chat Error:', error);
        return of({
          role: 'assistant' as const,
          content: 'I apologize, I encountered an issue. Please check your API key in the environment configuration and try again.',
          timestamp: new Date(),
        });
      })
    );
  }

  private buildSystemPrompt(steps: RoutineStep[], routineType: string): string {
    let routineContext = '';
    if (steps.length > 0) {
      const stepDetails = steps.map((s, i) => {
        const name = s.product?.name || 'Unknown Product';
        const brand = s.product?.brand || '';
        const category = s.product?.category || '';
        const notes = s.notes || '';
        return `  ${i + 1}. ${name} (${brand}) — ${category}${notes ? ` — Notes: ${notes}` : ''}`;
      }).join('\n');
      routineContext = `\n\nThe user's current ${routineType} skincare routine:\n${stepDetails}`;
    } else {
      routineContext = `\n\nThe user has no steps in their ${routineType} routine yet.`;
    }

    return `You are a friendly, knowledgeable board-certified dermatologist providing personalized skincare advice through a luxury self-care app called "Meadowcraft."

Your personality:
- Warm, approachable, and encouraging
- Evidence-based but accessible — avoid overly clinical jargon
- Concise responses (2-4 short paragraphs max)
- When recommending products, suggest categories/ingredients rather than specific brands
- Always remind users that for serious skin conditions, they should see a dermatologist in person

You have access to the user's skincare routine and should reference it when relevant.${routineContext}`;
  }
}
