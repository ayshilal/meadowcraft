import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSearchbar,
  IonLabel,
  IonList,
  IonItem,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButtons,
  IonChip,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeOutline,
  trashOutline,
  flaskOutline,
  cubeOutline,
  sunnyOutline,
  moonOutline,
  barcodeOutline,
  cameraOutline,
} from 'ionicons/icons';
import { ProductService } from '../../services/product.service';
import { RoutineService } from '../../services/routine.service';
import { BarcodeService, BarcodeResult } from '../../services/barcode.service';
import { ProductIdentification, VisionService, HarmonyResult, ApothecaryRating } from '../../services/vision.service';
import {
  Product,
  ProductCategory,
  PRODUCT_CATEGORIES,
} from '../../models/product.model';
import { RoutineStep } from '../../models/routine.model';
import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner.component';
import { ProductScannerComponent } from '../../components/product-scanner/product-scanner.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonLabel,
    IonList,
    IonItem,
      IonFab,
    IonFabButton,
    IonIcon,
    IonModal,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButtons,
    IonChip,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSpinner,
    BarcodeScannerComponent,
    ProductScannerComponent,
  ],
})
export class ProductsPage implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  selectedCategory: string = 'All';
  categories: string[] = ['All', ...PRODUCT_CATEGORIES];
  isModalOpen = false;
  isDetailOpen = false;
  isScannerOpen = false;
  isLookingUp = false;
  selectedProduct: Product | null = null;
  productRoutines: string[] = [];
  harmonyResult: HarmonyResult | null = null;
  isAnalyzingProduct = false;

  private morningSteps: RoutineStep[] = [];
  private eveningSteps: RoutineStep[] = [];

  newProduct: Product = {
    name: '',
    brand: '',
    category: 'Cleanser',
    description: '',
    notes: '',
    imageUrl: '',
  };

  productCategories = PRODUCT_CATEGORIES;

  isProductScannerOpen = false;

  constructor(
    private productService: ProductService,
    private routineService: RoutineService,
    private barcodeService: BarcodeService,
    private visionService: VisionService,
    private toastController: ToastController
  ) {
    addIcons({ addOutline, closeOutline, trashOutline, flaskOutline, cubeOutline, sunnyOutline, moonOutline, barcodeOutline, cameraOutline });
  }

  ngOnInit() {
    this.productService.getProducts().subscribe();
    this.productService.products$.subscribe((products) => {
      this.products = products;
      this.filterProducts();
    });
    this.routineService.morningRoutine$.subscribe(s => this.morningSteps = s);
    this.routineService.eveningRoutine$.subscribe(s => this.eveningSteps = s);
  }

  filterProducts() {
    let filtered = this.products;

    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === this.selectedCategory);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = filtered;
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.filterProducts();
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value || 'All';
    this.filterProducts();
  }

  openAddModal() {
    this.newProduct = {
      name: '',
      brand: '',
      category: 'Cleanser',
      description: '',
      notes: '',
      imageUrl: '',
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async addProduct() {
    if (!this.newProduct.name || !this.newProduct.brand) {
      const toast = await this.toastController.create({
        message: 'Please fill in product name and brand.',
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
      return;
    }

    this.productService.addProduct(this.newProduct).subscribe(async (savedProduct) => {
      this.isModalOpen = false;
      const toast = await this.toastController.create({
        message: 'Product added! Analyzing ingredients...',
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();

      // Auto-analyze if no rating yet
      if (!savedProduct.apothecaryRating) {
        this.autoAnalyzeProduct(savedProduct);
      }
    });
  }

  private autoAnalyzeProduct(product: Product) {
    this.visionService.analyzeProduct(
      product.name,
      product.brand,
      product.description
    ).subscribe({
      next: async (rating) => {
        product.apothecaryRating = rating;
        product.apothecaryRatingJson = JSON.stringify(rating);

        // Update in DB
        if (product.id) {
          this.productService.updateProduct(product.id, product).subscribe();
        }

        // Update local list
        const idx = this.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = { ...product };
        }

        const toast = await this.toastController.create({
          message: `Analyzed: ${rating.grade} — ${rating.ingredientRatings?.length || 0} ingredients rated`,
          duration: 3000,
          color: 'success',
          position: 'top',
        });
        await toast.present();
      },
      error: () => { /* silently fail — user can re-analyze manually */ },
    });
  }

  async deleteProduct(product: Product) {
    if (product.id) {
      this.productService.deleteProduct(product.id).subscribe(async () => {
        const toast = await this.toastController.create({
          message: `${product.name} removed.`,
          duration: 2000,
          color: 'medium',
          position: 'top',
        });
        await toast.present();
      });
    }
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      Cleanser: '🧴',
      Toner: '💧',
      Serum: '✨',
      Moisturizer: '🧊',
      SPF: '☀️',
      Mask: '🎭',
      Exfoliant: '🌿',
      'Eye Cream': '👁️',
      Oil: '🫧',
      Other: '💫',
    };
    return icons[category] || '💫';
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

  getSelectedCategoryPattern(): string {
    if (this.selectedCategory === 'All') {
      return 'assets/images/morris/kennet.jpg';
    }
    return this.getCategoryMorrisPattern(this.selectedCategory);
  }

  openProductDetail(product: Product) {
    this.selectedProduct = product;
    this.productRoutines = [];
    this.harmonyResult = null;
    this.isAnalyzingProduct = false;
    if (product.id) {
      if (this.morningSteps.some(s => s.productId === product.id)) {
        this.productRoutines.push('Morning');
      }
      if (this.eveningSteps.some(s => s.productId === product.id)) {
        this.productRoutines.push('Evening');
      }
    }
    this.isDetailOpen = true;

    // Load harmony if rating exists
    this.loadHarmonyForProduct(product);
  }

  closeProductDetail() {
    this.isDetailOpen = false;
  }

  getFlowerArray(grade: string): { filled: boolean }[] {
    const gradeMap: Record<string, number> = {
      'Exemplary': 5, 'Commendable': 4, 'Agreeable': 3, 'Questionable': 2, 'Cautionary': 1,
    };
    const count = gradeMap[grade] || 3;
    return Array.from({ length: 5 }, (_, i) => ({ filled: i < count }));
  }

  getIngredientIcon(rating: string): string {
    const icons: Record<string, string> = {
      'beneficial': 'assets/icons/apothecary/leaf.svg',
      'neutral': 'assets/icons/apothecary/scroll.svg',
      'caution': 'assets/icons/apothecary/flask.svg',
    };
    return icons[rating] || icons['neutral'];
  }

  async analyzeExistingProduct() {
    if (!this.selectedProduct) return;
    this.isAnalyzingProduct = true;

    this.visionService.analyzeProduct(
      this.selectedProduct.name,
      this.selectedProduct.brand,
      this.selectedProduct.description
    ).subscribe({
      next: async (rating) => {
        this.isAnalyzingProduct = false;
        if (this.selectedProduct) {
          this.selectedProduct.apothecaryRating = rating;
          this.selectedProduct.apothecaryRatingJson = JSON.stringify(rating);

          // Save to DB
          if (this.selectedProduct.id) {
            this.productService.updateProduct(this.selectedProduct.id, this.selectedProduct).subscribe();
          }

          // Load harmony
          this.loadHarmonyForProduct(this.selectedProduct);

          const toast = await this.toastController.create({
            message: `Analyzed: ${rating.grade}`,
            duration: 2000,
            color: 'success',
            position: 'top',
          });
          await toast.present();
        }
      },
      error: async () => {
        this.isAnalyzingProduct = false;
        const toast = await this.toastController.create({
          message: 'Analysis failed. Try again.',
          duration: 2000,
          color: 'warning',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  private loadHarmonyForProduct(product: Product) {
    if (!product.apothecaryRating?.ingredientRatings?.length) return;

    const otherProducts = this.products
      .filter(p => p.id !== product.id && p.description)
      .map(p => ({ name: p.name, ingredients: p.description || '' }));

    if (otherProducts.length > 0) {
      this.visionService.getHarmonyScore({
        productIngredients: product.apothecaryRating.ingredientRatings.map(i => i.name),
        existingProducts: otherProducts,
      }).subscribe({
        next: (result) => {
          this.harmonyResult = result;
          if (product.apothecaryRating) {
            product.apothecaryRating.harmony = result.harmony;
          }
        },
        error: () => {},
      });
    }
  }

  getGaugeDashoffset(score: number): string {
    const circumference = 2 * Math.PI * 34; // r=34
    const offset = circumference - (score / 100) * circumference;
    return `${offset}`;
  }

  getIngredientCounts(rating: ApothecaryRating): { beneficial: number; neutral: number; caution: number } {
    const items = rating.ingredientRatings || [];
    return {
      beneficial: items.filter(i => i.rating === 'beneficial').length,
      neutral: items.filter(i => i.rating === 'neutral').length,
      caution: items.filter(i => i.rating === 'caution').length,
    };
  }

  openScanner() {
    this.isScannerOpen = true;
  }

  closeScanner() {
    this.isScannerOpen = false;
  }

  async onBarcodeScanned(barcode: string) {
    this.isLookingUp = true;
    this.barcodeService.lookup(barcode).subscribe({
      next: async (result: BarcodeResult) => {
        this.isLookingUp = false;
        this.isScannerOpen = false;

        // Map categories string to a ProductCategory
        const category = this.mapCategory(result.categories);

        this.newProduct = {
          name: result.name || '',
          brand: result.brand || '',
          category,
          description: result.ingredients || '',
          notes: `Barcode: ${result.barcode}`,
          imageUrl: result.imageUrl || '',
        };

        this.isModalOpen = true;

        const toast = await this.toastController.create({
          message: `Found: ${result.name || 'Unknown product'}`,
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();
      },
      error: async () => {
        this.isLookingUp = false;
        const toast = await this.toastController.create({
          message: `Product not found for barcode: ${barcode}`,
          duration: 3000,
          color: 'warning',
          position: 'top',
        });
        await toast.present();
      },
    });
  }

  openProductScanner() {
    this.isProductScannerOpen = true;
  }

  closeProductScanner() {
    this.isProductScannerOpen = false;
  }

  async onProductIdentified(result: ProductIdentification) {
    this.isProductScannerOpen = false;

    const product: Product = {
      name: result.name || '',
      brand: result.brand || '',
      category: (result.category as ProductCategory) || 'Other',
      description: result.ingredients?.join(', ') || result.description || '',
      notes: `AI identified (confidence: ${Math.round(result.confidence * 100)}%)${result.apothecaryRating ? ' — Grade: ' + result.apothecaryRating.grade : ''}`,
      imageUrl: result.imageUrl || result.capturedImageUrl || '',
      apothecaryRating: result.apothecaryRating,
      apothecaryRatingJson: result.apothecaryRating ? JSON.stringify(result.apothecaryRating) : undefined,
    };

    if (result.confidence >= 0.7) {
      // High confidence — auto-save
      this.productService.addProduct(product).subscribe(async (savedProduct) => {
        // Hydrate the rating from the local data (API returns raw JSON string)
        if (product.apothecaryRating) {
          savedProduct.apothecaryRating = product.apothecaryRating;
        }

        const toast = await this.toastController.create({
          message: `Added: ${product.name}${product.apothecaryRating ? ' — ' + product.apothecaryRating.grade : ''}`,
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        // If no rating from camera scan, auto-analyze
        if (!savedProduct.apothecaryRating) {
          this.autoAnalyzeProduct(savedProduct);
        }
      });
    } else {
      // Low confidence — open form for review
      this.newProduct = product;
      this.isModalOpen = true;

      const toast = await this.toastController.create({
        message: `Low confidence — please review and edit`,
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
    }
  }

  private mapCategory(categories: string | null): ProductCategory {
    if (!categories) return 'Other';
    const lower = categories.toLowerCase();
    const mapping: [string[], ProductCategory][] = [
      [['cleanser', 'cleansing', 'wash', 'soap'], 'Cleanser'],
      [['toner', 'toning', 'lotion'], 'Toner'],
      [['serum', 'essence', 'ampoule'], 'Serum'],
      [['moisturizer', 'moisturiser', 'cream', 'hydrat'], 'Moisturizer'],
      [['sunscreen', 'spf', 'sun protection', 'solar'], 'SPF'],
      [['mask', 'masque'], 'Mask'],
      [['exfoliant', 'exfoliat', 'scrub', 'peel'], 'Exfoliant'],
      [['eye cream', 'eye care', 'contour des yeux'], 'Eye Cream'],
      [['oil', 'huile'], 'Oil'],
    ];
    for (const [keywords, cat] of mapping) {
      if (keywords.some((k) => lower.includes(k))) return cat;
    }
    return 'Other';
  }
}
