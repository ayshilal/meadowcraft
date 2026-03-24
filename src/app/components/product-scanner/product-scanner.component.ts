import {
  Component,
  ElementRef,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  Output,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { VisionService, ProductIdentification } from '../../services/vision.service';

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
    };
  }
}

type ScanState = 'starting' | 'scanning' | 'analyzing' | 'identified' | 'failed' | 'error';

@Component({
  selector: 'app-product-scanner',
  templateUrl: './product-scanner.component.html',
  styleUrls: ['./product-scanner.component.scss'],
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class ProductScannerComponent implements AfterViewInit, OnDestroy {
  @Output() productIdentified = new EventEmitter<ProductIdentification>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  state: ScanState = 'starting';
  identifiedProduct: ProductIdentification | null = null;
  capturedImageUrl = '';
  analyzingDots = '';
  errorMessage = '';
  attemptCount = 0;

  private stream: MediaStream | null = null;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private dotsInterval: ReturnType<typeof setInterval> | null = null;
  readonly MAX_ATTEMPTS = 3;
  private readonly SCAN_INTERVAL_MS = 3500;
  private isAnalyzing = false;
  private detectedBarcode: string | null = null;

  constructor(
    private visionService: VisionService,
    private ngZone: NgZone,
  ) {
    addIcons({ checkmarkCircleOutline, closeOutline, alertCircleOutline });
  }

  ngAfterViewInit() {
    setTimeout(() => this.startCamera(), 300);
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    this.state = 'starting';
    this.errorMessage = '';
    this.attemptCount = 0;
    this.detectedBarcode = null;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      // Wait for view to render the video element
      setTimeout(() => {
        const video = this.videoElement?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
          video.onloadedmetadata = () => {
            video.play();
            this.ngZone.run(() => {
              this.state = 'scanning';
              this.startPeriodicCapture();
            });
          };
        }
      }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        this.errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (message.includes('NotFoundError') || message.includes('no camera')) {
        this.errorMessage = 'No camera found on this device.';
      } else {
        this.errorMessage = `Camera error: ${message}`;
      }
      this.state = 'error';
    }
  }

  private startPeriodicCapture() {
    // First capture after 1.5s to give user time to aim
    setTimeout(() => this.captureAndIdentify(), 1500);

    this.scanInterval = setInterval(() => {
      if (!this.isAnalyzing && this.state === 'scanning') {
        this.captureAndIdentify();
      }
    }, this.SCAN_INTERVAL_MS);
  }

  private captureAndIdentify() {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;

    this.isAnalyzing = true;
    this.state = 'analyzing';
    this.startThinkingDots();

    // Resize to max 800px width for smaller payload
    const scale = Math.min(800 / video.videoWidth, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG at 70% quality
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];

    // Save the captured image for the product
    this.capturedImageUrl = dataUrl;

    // Try to detect barcode from the canvas (non-blocking)
    this.tryDetectBarcode(canvas);

    this.visionService.identifyProduct(base64, this.detectedBarcode).subscribe({
      next: (result) => {
        this.isAnalyzing = false;
        this.stopThinkingDots();
        this.attemptCount++;

        if (result.confidence > 0.7 && result.name && result.name !== 'Unknown Product') {
          // Attach captured image to result
          result.capturedImageUrl = this.capturedImageUrl;
          this.identifiedProduct = result;
          this.state = 'identified';
          this.stopPeriodicCapture();

          // Auto-emit after showing checkmark for 1.5s
          setTimeout(() => {
            this.productIdentified.emit(result);
          }, 1500);
        } else if (this.attemptCount >= this.MAX_ATTEMPTS) {
          this.state = 'failed';
          if (result.name) {
            result.capturedImageUrl = this.capturedImageUrl;
            this.identifiedProduct = result;
          } else {
            this.identifiedProduct = null;
          }
          this.stopPeriodicCapture();
        } else {
          this.state = 'scanning';
        }
      },
      error: () => {
        this.isAnalyzing = false;
        this.stopThinkingDots();
        this.attemptCount++;

        if (this.attemptCount >= this.MAX_ATTEMPTS) {
          this.state = 'failed';
          this.stopPeriodicCapture();
        } else {
          this.state = 'scanning';
        }
      },
    });
  }

  private startThinkingDots() {
    this.analyzingDots = '';
    let count = 0;
    this.dotsInterval = setInterval(() => {
      count = (count + 1) % 4;
      this.ngZone.run(() => {
        this.analyzingDots = '.'.repeat(count);
      });
    }, 400);
  }

  private stopThinkingDots() {
    if (this.dotsInterval) {
      clearInterval(this.dotsInterval);
      this.dotsInterval = null;
    }
    this.analyzingDots = '';
  }

  retryScanning() {
    this.attemptCount = 0;
    this.identifiedProduct = null;
    this.state = 'scanning';
    this.startPeriodicCapture();
  }

  useResult() {
    if (this.identifiedProduct) {
      this.productIdentified.emit(this.identifiedProduct);
    }
  }

  cancel() {
    this.stopCamera();
    this.cancelled.emit();
  }

  private tryDetectBarcode(canvas: HTMLCanvasElement) {
    // Use BarcodeDetector API if available (Chrome/Edge)
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        detector.detect(canvas).then((barcodes: { rawValue: string }[]) => {
          if (barcodes.length > 0 && !this.detectedBarcode) {
            this.detectedBarcode = barcodes[0].rawValue;
          }
        }).catch(() => {});
      } catch { /* BarcodeDetector not fully supported */ }
    }
  }

  private stopPeriodicCapture() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  private stopCamera() {
    this.stopPeriodicCapture();
    this.stopThinkingDots();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
