import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FixedData } from '../models';
import { ExerciseService } from '../shared/exercise.service';

@Component({
  templateUrl: './exercise2.component.html',
  styleUrls: ['./exercise2.component.scss']
})
export class Exercise2Component implements OnInit {
  titulo = 'Ejercicio 2 - Mango Frontend Test';
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();
  data: FixedData;
  slideValores: number[];

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
        this.data = data;
        this.slideValores = Array.of(data.valores[0], data.valores[data.valores.length - 1]);
      });
  }

  onRangeChange(event) {
    console.log(event);
  }
}
