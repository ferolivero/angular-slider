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
  fixedData: CustomFixedRange;

  constructor(private exerciseService: ExerciseService) {}

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
        this.fixedData = data;
      });
  }
}
