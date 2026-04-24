import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonReorder,
  IonReorderGroup,
  IonIcon,
  IonButton,
  IonButtons,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonNote,
  IonFab,
  IonFabButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonFooter,
  IonTextarea,
  IonSpinner,
  ToastController,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sunnyOutline,
  moonOutline,
  addOutline,
  closeOutline,
  reorderThreeOutline,
  trashOutline,
  waterOutline,
  chatbubblesOutline,
  sendOutline,
  checkmarkOutline,
  sparklesOutline,
  calendarOutline,
} from 'ionicons/icons';
import { RoutineService, GeneratedRoutine, GeneratedStep, DaySchedule } from '../../services/routine.service';
import { ProductService } from '../../services/product.service';
import { AiChatService } from '../../services/ai-chat.service';
import { ProgressService } from '../../services/progress.service';
import { RoutineStep } from '../../models/routine.model';
import { Product } from '../../models/product.model';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-routine',
  templateUrl: './routine.page.html',
  styleUrls: ['./routine.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonReorder,
    IonReorderGroup,
    IonIcon,
    IonButton,
    IonButtons,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonNote,
    IonFab,
    IonFabButton,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonFooter,
    IonTextarea,
    IonSpinner,
  ],
})
export class RoutinePage implements OnInit {
  routineType: 'Morning' | 'Evening' = 'Morning';
  steps: RoutineStep[] = [];
  products: Product[] = [];
  isModalOpen = false;

  selectedProductId: number | null = null;
  newStepNotes = '';

  // Product Detail
  isDetailOpen = false;
  selectedProduct: Product | null = null;

  // Progress
  doneCount = 0;

  // Chat
  isChatOpen = false;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  isSending = false;
  isAiConfigured = true;
  @ViewChild('chatContent') chatContent!: IonContent;

  // AI Routine Generation
  isGenerating = false;
  isPreviewOpen = false;
  generatedRoutine: GeneratedRoutine | null = null;
  previewType: 'Morning' | 'Evening' = 'Morning';
  isApplying = false;

  // Weekly Schedule
  weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  weekDayLabels: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
  };
  selectedDay = '';
  isScheduleOpen = false;
  savedWeeklySchedule: { [day: string]: DaySchedule } | null = null;
  weekOverrides: { usedThisWeek: string[]; skippedToday: string[] } = { usedThisWeek: [], skippedToday: [] };

  constructor(
    private routineService: RoutineService,
    private productService: ProductService,
    private aiChatService: AiChatService,
    private progressService: ProgressService,
    private toastController: ToastController
  ) {
    addIcons({
      sunnyOutline,
      moonOutline,
      addOutline,
      closeOutline,
      reorderThreeOutline,
      trashOutline,
      waterOutline,
      chatbubblesOutline,
      sendOutline,
      checkmarkOutline,
      sparklesOutline,
      calendarOutline,
    });
    this.isAiConfigured = true;
  }

  ngOnInit() {
    this.productService.products$.subscribe(
      (products) => (this.products = products)
    );
    this.loadSteps();

    // Load saved weekly schedule
    const saved = localStorage.getItem('weeklySchedule');
    if (saved) {
      try { this.savedWeeklySchedule = JSON.parse(saved); } catch { /* ignore */ }
    }
    // Load overrides (reset daily)
    const overrides = localStorage.getItem('weekOverrides');
    if (overrides) {
      try {
        const parsed = JSON.parse(overrides);
        // Reset if it's a new day
        if (parsed.date === new Date().toDateString()) {
          this.weekOverrides = parsed;
        } else {
          // New day — clear skippedToday but keep usedThisWeek
          this.weekOverrides = { usedThisWeek: parsed.usedThisWeek || [], skippedToday: [] };
          this.saveOverrides();
        }
      } catch { /* ignore */ }
    }
  }

  loadSteps() {
    this.routineService.loadRoutine(this.routineType as 'Morning' | 'Evening');
    if (this.routineType === 'Morning') {
      this.routineService.morningRoutine$.subscribe(
        (steps) => {
          this.steps = [...steps].sort((a, b) => a.order - b.order);
          this.doneCount = this.progressService.getDoneCount(this.routineType);
        }
      );
    } else {
      this.routineService.eveningRoutine$.subscribe(
        (steps) => {
          this.steps = [...steps].sort((a, b) => a.order - b.order);
          this.doneCount = this.progressService.getDoneCount(this.routineType);
        }
      );
    }
  }

  onSegmentChange(event: any) {
    this.routineType = event.detail.value;
    this.loadSteps();
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const movedSteps = event.detail.complete(this.steps);
    this.routineService.reorderSteps(this.routineType, movedSteps);
  }

  openAddModal() {
    this.selectedProductId = null;
    this.newStepNotes = '';
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async addStep() {
    if (!this.selectedProductId) {
      const toast = await this.toastController.create({
        message: 'Please select a product.',
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
      return;
    }

    const product = this.products.find((p) => p.id === this.selectedProductId);
    const newStep: RoutineStep = {
      productId: this.selectedProductId,
      product: product,
      order: this.steps.length + 1,
      notes: this.newStepNotes,
    };

    this.routineService
      .addStep(this.routineType, newStep)
      .subscribe(async () => {
        this.isModalOpen = false;
        const toast = await this.toastController.create({
          message: 'Step added to your routine!',
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();
      });
  }

  async removeStep(step: RoutineStep) {
    if (step.id) {
      this.routineService
        .removeStep(this.routineType, step.id)
        .subscribe(async () => {
          const toast = await this.toastController.create({
            message: 'Step removed.',
            duration: 2000,
            color: 'medium',
            position: 'top',
          });
          await toast.present();
        });
    }
  }

  getStepIcon(index: number): string {
    const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return icons[index] || `${index + 1}`;
  }

  getRoutinePattern(): string {
    return this.routineType === 'Morning'
      ? 'assets/images/morris/willow-bough.jpg'
      : 'assets/images/morris/strawberry-thief.jpg';
  }

  getCategoryMorrisPattern(category: string): string {
    const patterns: Record<string, string> = {
      Cleanser: 'assets/images/morris/willow-bough.jpg',
      Toner: 'assets/images/morris/honeysuckle.jpg',
      Serum: 'assets/images/morris/strawberry-thief.jpg',
      Moisturizer: 'assets/images/morris/pimpernel.jpg',
      SPF: 'assets/images/morris/fruit.jpg',
      Mask: 'assets/images/morris/cray.jpg',
      Exfoliant: 'assets/images/morris/snakeshead.jpg',
      'Eye Cream': 'assets/images/morris/honeysuckle-met.jpg',
      Oil: 'assets/images/morris/evenlode.jpg',
      Other: 'assets/images/morris/medway.jpg',
    };
    return patterns[category] || 'assets/images/morris/wandle.jpg';
  }

  getCategoryImage(category: string): string {
    const images: Record<string, string> = {
      Cleanser: 'assets/illustrations/cleanser.svg',
      Toner: 'assets/illustrations/toner.svg',
      Serum: 'assets/illustrations/serum.svg',
      Moisturizer: 'assets/illustrations/moisturizer.svg',
      SPF: 'assets/illustrations/spf.svg',
      Mask: 'assets/illustrations/mask.svg',
      Exfoliant: 'assets/illustrations/exfoliant.svg',
      'Eye Cream': 'assets/illustrations/eye-cream.svg',
      Oil: 'assets/illustrations/oil.svg',
      Other: 'assets/illustrations/other.svg',
    };
    return images[category] || 'assets/illustrations/other.svg';
  }

  // --- Progress Methods ---

  isStepDone(index: number): boolean {
    return this.progressService.isStepDone(this.routineType, index);
  }

  toggleStepDone(index: number, event: Event) {
    event.stopPropagation();
    this.progressService.toggleStep(this.routineType, index);
    this.doneCount = this.progressService.getDoneCount(this.routineType);
    if (this.doneCount === this.steps.length && this.steps.length > 0) {
      this.progressService.markRoutineComplete(this.routineType);
    }
  }

  getProgress(): number {
    if (this.steps.length === 0) return 0;
    return this.progressService.getDoneCount(this.routineType);
  }

  // --- Product Detail ---

  openProductDetail(product: Product | undefined) {
    if (!product) return;
    this.selectedProduct = product;
    this.isDetailOpen = true;
  }

  closeProductDetail() {
    this.isDetailOpen = false;
  }

  // --- Chat Methods ---

  private mockResponses: string[] = [
    'Based on your routine, I\'d recommend adding a vitamin C serum in the morning before your moisturizer. It helps brighten skin and provides antioxidant protection throughout the day.',
    'Great question! For your skin type, I\'d suggest waiting about 30 seconds between each step to let each product absorb properly. This maximizes the efficacy of each active ingredient.',
    'I notice you\'re using a cleanser — make sure you\'re double cleansing in the evening if you wear sunscreen or makeup. An oil-based cleanser first, then your regular cleanser.',
    'Hydration is key! Consider incorporating a hyaluronic acid serum. Apply it on damp skin for best results — it draws moisture into the skin layers.',
    'Your routine looks well-structured! One suggestion: always apply products from thinnest to thickest consistency. This ensures proper absorption of each layer.',
    'Retinol is a wonderful anti-aging ingredient, but start slowly — 2-3 times per week. And never mix it with vitamin C in the same routine. Use vitamin C in the morning and retinol at night.',
  ];

  openChat() {
    this.isChatOpen = true;
    if (this.chatMessages.length === 0) {
      if (this.aiChatService.isConfigured()) {
        const greeting = this.aiChatService.getGreeting(this.steps, this.routineType);
        this.chatMessages.push(greeting);
      } else {
        this.chatMessages.push({
          role: 'assistant',
          content: this.steps.length > 0
            ? `Hello! I can see your ${this.routineType.toLowerCase()} routine has ${this.steps.length} step${this.steps.length !== 1 ? 's' : ''}. I\'m your AI dermatologist — ask me anything about your skincare routine, product order, or ingredients!`
            : `Welcome! I\'m your AI dermatologist. You haven\'t added any steps to your ${this.routineType.toLowerCase()} routine yet. I can help you build the perfect routine — just ask!`,
          timestamp: new Date(),
        });
      }
    }
  }

  closeChat() {
    this.isChatOpen = false;
  }

  sendChatMessage() {
    const message = this.chatInput.trim();
    if (!message || this.isSending) return;

    this.chatMessages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    this.chatInput = '';
    this.isSending = true;
    this.scrollChatToBottom();

    if (this.aiChatService.isConfigured()) {
      this.aiChatService
        .sendMessage(message, this.steps, this.routineType, this.products, this.chatMessages)
        .subscribe({
          next: (response) => {
            this.chatMessages.push(response);
            this.isSending = false;
            this.scrollChatToBottom();
          },
          error: () => {
            this.chatMessages.push({
              role: 'assistant',
              content: 'Sorry, something went wrong. Please try again.',
              timestamp: new Date(),
            });
            this.isSending = false;
            this.scrollChatToBottom();
          },
        });
    } else {
      // Mock response with realistic delay
      setTimeout(() => {
        const idx = Math.floor(Math.random() * this.mockResponses.length);
        this.chatMessages.push({
          role: 'assistant',
          content: this.mockResponses[idx],
          timestamp: new Date(),
        });
        this.isSending = false;
        this.scrollChatToBottom();
      }, 1200);
    }
  }

  private scrollChatToBottom() {
    setTimeout(() => {
      this.chatContent?.scrollToBottom(300);
    }, 100);
  }

  // --- AI Routine Generation ---

  async generateRoutine() {
    if (this.products.length === 0) {
      const toast = await this.toastController.create({
        message: 'Add some products first before generating a routine.',
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
      return;
    }

    this.isGenerating = true;

    const request = {
      products: this.products.map(p => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
      })),
    };

    this.routineService.generateRoutine(request).subscribe({
      next: async (result) => {
        this.isGenerating = false;
        this.generatedRoutine = result;
        this.previewType = this.routineType;
        this.isPreviewOpen = true;
      },
      error: async () => {
        this.isGenerating = false;
        const toast = await this.toastController.create({
          message: 'Failed to generate routine. Try again.',
          duration: 2000,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  getPreviewSteps(): GeneratedStep[] {
    if (!this.generatedRoutine) return [];
    return this.previewType === 'Morning'
      ? this.generatedRoutine.morningSteps
      : this.generatedRoutine.eveningSteps;
  }

  getProductImage(stepName: string): string {
    const product = this.products.find(p =>
      p.name.toLowerCase() === stepName.toLowerCase() ||
      p.name.toLowerCase().includes(stepName.toLowerCase()) ||
      stepName.toLowerCase().includes(p.name.toLowerCase())
    );
    return product?.imageUrl || '';
  }

  getCategoryImageForStep(category: string): string {
    const images: Record<string, string> = {
      Cleanser: 'assets/illustrations/cleanser.svg',
      Toner: 'assets/illustrations/toner.svg',
      Serum: 'assets/illustrations/serum.svg',
      Moisturizer: 'assets/illustrations/moisturizer.svg',
      SPF: 'assets/illustrations/spf.svg',
      Mask: 'assets/illustrations/mask.svg',
      Exfoliant: 'assets/illustrations/exfoliant.svg',
      'Eye Cream': 'assets/illustrations/eye-cream.svg',
      Oil: 'assets/illustrations/oil.svg',
      Other: 'assets/illustrations/other.svg',
    };
    return images[category] || 'assets/illustrations/other.svg';
  }

  closePreview() {
    this.isPreviewOpen = false;
    this.generatedRoutine = null;
  }

  async applyRoutine() {
    if (!this.generatedRoutine) return;
    this.isApplying = true;

    // Save weekly schedule to localStorage before clearing generatedRoutine
    if (this.generatedRoutine.weeklySchedule) {
      localStorage.setItem('weeklySchedule', JSON.stringify(this.generatedRoutine.weeklySchedule));
      this.savedWeeklySchedule = this.generatedRoutine.weeklySchedule;
    }

    this.routineService.applyGeneratedRoutine(this.generatedRoutine).subscribe({
      next: async () => {
        this.isApplying = false;
        this.isPreviewOpen = false;
        this.generatedRoutine = null;

        const toast = await this.toastController.create({
          message: 'Routine applied! Both morning and evening routines updated.',
          duration: 3000,
          color: 'success',
          position: 'top',
        });
        await toast.present();
      },
      error: async () => {
        this.isApplying = false;
        const toast = await this.toastController.create({
          message: 'Failed to apply routine. Try again.',
          duration: 2000,
          color: 'danger',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  // --- Weekly Schedule ---

  hasWeeklySchedule(): boolean {
    return !!this.generatedRoutine?.weeklySchedule &&
      Object.keys(this.generatedRoutine.weeklySchedule).length > 0;
  }

  getDaySchedule(day: string): DaySchedule | null {
    return this.generatedRoutine?.weeklySchedule?.[day] ?? null;
  }

  isDayDifferent(day: string): boolean {
    if (!this.generatedRoutine?.weeklySchedule) return false;
    const schedule = this.generatedRoutine.weeklySchedule[day];
    if (!schedule) return false;
    const baseMorningCount = this.generatedRoutine.morningSteps.length;
    const baseEveningCount = this.generatedRoutine.eveningSteps.length;
    return schedule.morning.length !== baseMorningCount ||
           schedule.evening.length !== baseEveningCount;
  }

  openDayDetail(day: string) {
    this.selectedDay = day;
    this.isScheduleOpen = true;
  }

  closeDayDetail() {
    this.isScheduleOpen = false;
  }

  getTodayKey(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  getTodaySchedule(): DaySchedule | null {
    if (!this.savedWeeklySchedule) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    return this.savedWeeklySchedule[today] ?? null;
  }

  getTodayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }

  getTodayProducts(): string[] {
    const schedule = this.getTodaySchedule();
    if (!schedule) return [];
    return this.routineType === 'Morning' ? schedule.morning : schedule.evening;
  }

  isProductScheduledToday(productName: string): boolean {
    const lower = productName.toLowerCase();

    // Check if skipped today
    if (this.weekOverrides.skippedToday.includes(lower)) return false;

    // Check if used this week (and it's a limited-use product)
    if (this.weekOverrides.usedThisWeek.includes(lower)) return false;

    const todayProducts = this.getTodayProducts();
    if (todayProducts.length === 0) return true; // No schedule = use all
    return todayProducts.some(p =>
      p.toLowerCase().includes(lower) ||
      lower.includes(p.toLowerCase())
    );
  }

  getSavedDaySchedule(day: string): DaySchedule | null {
    return this.savedWeeklySchedule?.[day] ?? null;
  }

  isSavedDayDifferent(day: string): boolean {
    if (!this.savedWeeklySchedule) return false;
    const schedule = this.savedWeeklySchedule[day];
    if (!schedule) return false;
    // Compare against the longest day (full routine)
    const maxMorning = Math.max(...Object.values(this.savedWeeklySchedule).map(d => d.morning.length));
    const maxEvening = Math.max(...Object.values(this.savedWeeklySchedule).map(d => d.evening.length));
    return schedule.morning.length < maxMorning || schedule.evening.length < maxEvening;
  }

  async markUsedSkipWeek(productName: string) {
    if (!productName) return;
    const lower = productName.toLowerCase();
    if (!this.weekOverrides.usedThisWeek.includes(lower)) {
      this.weekOverrides.usedThisWeek.push(lower);
      this.saveOverrides();

      // Also remove from remaining days in savedWeeklySchedule
      if (this.savedWeeklySchedule) {
        const todayIdx = new Date().getDay(); // 0=Sun
        const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = todayIdx + 1; i < 7; i++) {
          const day = dayOrder[i];
          const schedule = this.savedWeeklySchedule[day];
          if (schedule) {
            schedule.evening = schedule.evening.filter(p => !p.toLowerCase().includes(lower) && !lower.includes(p.toLowerCase()));
            schedule.morning = schedule.morning.filter(p => !p.toLowerCase().includes(lower) && !lower.includes(p.toLowerCase()));
          }
        }
        localStorage.setItem('weeklySchedule', JSON.stringify(this.savedWeeklySchedule));
      }

      const toast = await this.toastController.create({
        message: `Used ${productName} — skipping for the rest of the week`,
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    }
  }

  async skipToday(productName: string) {
    if (!productName) return;
    const lower = productName.toLowerCase();
    if (!this.weekOverrides.skippedToday.includes(lower)) {
      this.weekOverrides.skippedToday.push(lower);
      this.saveOverrides();

      const toast = await this.toastController.create({
        message: `Skipping ${productName} today`,
        duration: 2000,
        color: 'medium',
        position: 'top',
      });
      await toast.present();
    }
  }

  async resetScheduleTracking() {
    localStorage.removeItem('weekOverrides');
    localStorage.removeItem('weeklySchedule');
    this.savedWeeklySchedule = null;
    this.weekOverrides = { usedThisWeek: [], skippedToday: [] };
    const toast = await this.toastController.create({
      message: 'Schedule tracking reset',
      duration: 1500,
      color: 'medium',
      position: 'top',
    });
    await toast.present();
  }

  private saveOverrides() {
    localStorage.setItem('weekOverrides', JSON.stringify({
      ...this.weekOverrides,
      date: new Date().toDateString(),
    }));
  }

  getDayDifferences(day: string): { removed: string[]; added: string[] } {
    if (!this.generatedRoutine?.weeklySchedule) return { removed: [], added: [] };
    const schedule = this.generatedRoutine.weeklySchedule[day];
    if (!schedule) return { removed: [], added: [] };

    const baseEvening = this.generatedRoutine.eveningSteps.map(s => s.productName.toLowerCase());
    const dayEvening = schedule.evening.map(s => s.toLowerCase());

    const removed = baseEvening.filter(p => !dayEvening.includes(p));
    const added = dayEvening.filter(p => !baseEvening.includes(p));

    return { removed, added };
  }
}
