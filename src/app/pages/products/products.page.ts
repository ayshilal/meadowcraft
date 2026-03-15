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
} from 'ionicons/icons';
import { ProductService } from '../../services/product.service';
import { RoutineService } from '../../services/routine.service';
import {
  Product,
  PRODUCT_CATEGORIES,
} from '../../models/product.model';
import { RoutineStep } from '../../models/routine.model';

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
  selectedProduct: Product | null = null;
  productRoutines: string[] = [];

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

  constructor(
    private productService: ProductService,
    private routineService: RoutineService,
    private toastController: ToastController
  ) {
    addIcons({ addOutline, closeOutline, trashOutline, flaskOutline, cubeOutline, sunnyOutline, moonOutline });
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

    this.productService.addProduct(this.newProduct).subscribe(async () => {
      this.isModalOpen = false;
      const toast = await this.toastController.create({
        message: 'Product added successfully!',
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
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
    if (product.id) {
      if (this.morningSteps.some(s => s.productId === product.id)) {
        this.productRoutines.push('Morning');
      }
      if (this.eveningSteps.some(s => s.productId === product.id)) {
        this.productRoutines.push('Evening');
      }
    }
    this.isDetailOpen = true;
  }

  closeProductDetail() {
    this.isDetailOpen = false;
  }
}
