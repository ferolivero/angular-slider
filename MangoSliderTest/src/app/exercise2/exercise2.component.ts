import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomFixedRange } from '../models';
import { ExerciseService } from '../shared/exercise.service';

@Component({
  templateUrl: './exercise2.component.html',
  styleUrls: ['./exercise2.component.scss']
})
export class Exercise2Component implements OnInit {
  titulo = 'Ejercicio 2 - Mango Frontend Test';
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  // Products with their categories
  fixedRangeData: CustomFixedRange;

  // Selected product to highlight the entry
  // selectedProduct$ = this.exerciseService.selectedProduct$;

  // Combine all streams for the view
  // vm$ = combineLatest([
  //   this.products$,
  //   this.selectedProduct$
  // ])
  //   .pipe(
  //     map(([products, product]: [Product[], Product]) =>
  //       ({ products, productId: product ? product.id : 0 }))
  //   );

  constructor(private exerciseService: ExerciseService) {}

  // onSelected(productId: number): void {
  //   this.exerciseService.selectedProductChanged(productId);
  // }

  ngOnInit(): void {
    this.exerciseService.customFixedRangeData$
      .pipe(
        catchError((err) => {
          this.errorMessageSubject.next(err);
          return EMPTY;
        })
      )
      .subscribe((data) => {
        console.log(data);
        this.fixedRangeData = data;
      });
  }
}
