import {
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  closeOutline,
  searchOutline,
  stopOutline,
} from 'ionicons/icons';
import { Html5Qrcode } from 'html5-qrcode';

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
  ],
})
export class BarcodeScannerComponent implements AfterViewInit, OnDestroy {
  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  manualBarcode = '';
  isScanning = false;
  errorMessage = '';

  private scanner: Html5Qrcode | null = null;
  private readonly scannerId = 'barcode-reader';

  constructor() {
    addIcons({ cameraOutline, closeOutline, searchOutline, stopOutline });
  }

  ngAfterViewInit() {
    // Auto-start camera when component opens
    setTimeout(() => this.startScanning(), 300);
  }

  ngOnDestroy() {
    this.stopScanning();
  }

  async startScanning() {
    this.errorMessage = '';

    try {
      this.scanner = new Html5Qrcode(this.scannerId);

      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Success — barcode found
          this.stopScanning();
          this.barcodeScanned.emit(decodedText);
        },
        () => {
          // No barcode detected in this frame — ignore
        }
      );

      this.isScanning = true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        this.errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (message.includes('NotFoundError') || message.includes('no camera')) {
        this.errorMessage = 'No camera found on this device.';
      } else {
        this.errorMessage = `Camera error: ${message}`;
      }
      this.isScanning = false;
    }
  }

  async stopScanning() {
    if (this.scanner) {
      try {
        if (this.isScanning) {
          await this.scanner.stop();
        }
      } catch {
        // Ignore stop errors
      }
      this.scanner = null;
    }
    this.isScanning = false;
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
