import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomNormalRange } from '../models';
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
  data: CustomNormalRange;

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
        this.data = data;
      });
  }
}
