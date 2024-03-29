import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NormalData } from '../models';
import { ExerciseService } from '../shared/exercise.service';

//import { ProductCategoryService } from '../product-categories/product-category.service';

@Component({
  templateUrl: './exercise1.component.html',
  styleUrls: ['./exercise1.component.scss']
})
export class Exercise1Component implements OnInit {
  titulo = 'Ejercicio 1 - Frontend Challenge';
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();
  data: NormalData;
  slideValores: number[];

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
        this.data = data;
        this.slideValores = Object.values(data);
        // this.slideValores = [5, 50];
      });
  }

  onRangeChange(event) {
    console.log(event);
  }
}
