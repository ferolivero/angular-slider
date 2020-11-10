import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomNormalRange } from '../data/custom-range';
import { Options } from '../helpers/options';
import { ExerciseService } from '../shared/exercise.service';

//import { ProductCategoryService } from '../product-categories/product-category.service';

@Component({
  templateUrl: './exercise1.component.html',
  styleUrls: ['./exercise1.component.scss']
})
export class Exercise1Component implements OnInit {
  titulo = 'Ejercicio 1 - Mango Frontend Test';
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  customNormalRangeData: CustomNormalRange;

  min: number = 1;
  max: number = 8;
  options: Options = {
    floor: 0,
    ceil: 10
  };

  // Categories for drop down list
  // categories$ = this.productCategoryService.productCategories$.pipe(
  //   catchError((err) => {
  //     this.errorMessageSubject.next(err);
  //     return EMPTY;
  //   })
  // );

  // Action stream
  // private categorySelectedSubject = new BehaviorSubject<number>(0);
  // categorySelectedAction$ = this.categorySelectedSubject.asObservable();

  // Merge Data stream with Action stream
  // To filter to the selected category
  // products$ = combineLatest([this.productService.productsWithAdd$, this.categorySelectedAction$]).pipe(
  //   map(([products, selectedCategoryId]) =>
  //     products.filter((product) => (selectedCategoryId ? product.categoryId === selectedCategoryId : true))
  //   ),
  //   catchError((err) => {
  //     this.errorMessageSubject.next(err);
  //     return EMPTY;
  //   })
  // );

  // Categories for drop down list
  // categories$ = this.productCategoryService.productCategories$.pipe(
  //   catchError((err) => {
  //     this.errorMessageSubject.next(err);
  //     return EMPTY;
  //   })
  // );

  // Combine all streams for the view
  // vm$ = combineLatest([this.products$, this.categories$]).pipe(
  //   map(([products, categories]) => ({ products, categories }))
  // );

  // constructor(private productService: ExerciseService,
  //             private productCategoryService: ProductCategoryService) { }

  constructor(private exerciseService: ExerciseService) {}

  ngOnInit(): void {
    this.exerciseService.customNormalRangeData$
      .pipe(
        catchError((err) => {
          this.errorMessageSubject.next(err);
          return EMPTY;
        })
      )
      .subscribe((data) => {
        console.log(data);
        this.customNormalRangeData = data;
      });
  }

  // onAdd(): void {
  //   this.productService.addProduct();
  // }

  // onSelected(categoryId: string): void {
  //   this.categorySelectedSubject.next(+categoryId);
  // }
}
