import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  closeOutline,
  searchOutline,
  stopOutline,
} from 'ionicons/icons';

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
    };
  }
}

@Component({
  selector: 'app-barcode-scanner',
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner,
  ],
})
export class BarcodeScannerComponent implements OnDestroy {
  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  manualBarcode = '';
  isScanning = false;
  isCameraSupported = false;
  isBarcodeDetectorSupported = false;
  errorMessage = '';

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private detector: InstanceType<NonNullable<Window['BarcodeDetector']>> | null = null;

  constructor() {
    addIcons({ cameraOutline, closeOutline, searchOutline, stopOutline });
    this.isCameraSupported = !!navigator.mediaDevices?.getUserMedia;
    this.isBarcodeDetectorSupported = !!window.BarcodeDetector;
  }

  ngOnDestroy() {
    this.stopScanning();
  }

  async startScanning() {
    this.errorMessage = '';

    if (!this.isBarcodeDetectorSupported) {
      this.errorMessage =
        'BarcodeDetector API not supported in this browser. Use manual entry or try Chrome/Edge.';
      return;
    }

    try {
      this.detector = new window.BarcodeDetector!({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      this.isScanning = true;

      // Wait for view to update so video element exists
      setTimeout(() => {
        const video = this.videoElement?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
          video.play();
          this.scanFrame();
        }
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.errorMessage = `Camera error: ${message}`;
      this.isScanning = false;
    }
  }

  stopScanning() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.isScanning = false;
  }

  private scanFrame() {
    if (!this.isScanning || !this.detector) return;

    const video = this.videoElement?.nativeElement;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
      return;
    }

    const canvas = this.canvasElement?.nativeElement;
    if (!canvas) {
      this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }

    this.detector
      .detect(canvas)
      .then((barcodes) => {
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          this.stopScanning();
          this.barcodeScanned.emit(code);
        } else {
          this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
        }
      })
      .catch(() => {
        this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
      });
  }

  submitManual() {
    const code = this.manualBarcode.trim();
    if (code) {
      this.barcodeScanned.emit(code);
      this.manualBarcode = '';
    }
  }

  cancel() {
    this.stopScanning();
    this.cancelled.emit();
  }
}
