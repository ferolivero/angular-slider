import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { FixedData, NormalData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private normalUrl = 'api/normal';
  private fixedUrl = 'api/fixed';

  customNormalRangeData$ = this.http.get<NormalData>(this.normalUrl).pipe(
    tap((data) => console.log('Normal Data', JSON.stringify(data))),
    shareReplay(1),
    catchError(this.handleError)
  );

  customFixedRangeData$ = this.http.get<FixedData>(this.fixedUrl).pipe(
    tap((data) => console.log('Fixed Data', JSON.stringify(data))),
    shareReplay(1),
    catchError(this.handleError)
  );

  constructor(private http: HttpClient) {}

  private handleError(err: any): Observable<never> {
    let errorMessage = `Error en la invocacion al servicio ${err.status}: ${err.body.error}`;
    console.error(err);
    return throwError(errorMessage);
  }
}
