import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { EMPTY, fromEvent, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomNormalRange, SliderValores, TipoPunto } from '../models';
import { NgcRangeComponent } from '../ngc-range/ngc-range.component';
import { ExerciseService } from '../shared/exercise.service';

//import { ProductCategoryService } from '../product-categories/product-category.service';

@Component({
  templateUrl: './exercise1.component.html',
  styleUrls: ['./exercise1.component.scss']
})
export class Exercise1Component implements OnInit, AfterViewInit {
  titulo = 'Ejercicio 1 - Mango Frontend Test';
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();
  data: CustomNormalRange;
  slideValores: number[];
  valor: number;
  tipoPuntoMin = TipoPunto.Min;
  tipoPuntoMax = TipoPunto.Max;

  @ViewChild('valorElement') inputValorElement: ElementRef;
  @ViewChild('valorSuperiorElement') inputValorSuperiorElement: ElementRef;
  @ViewChild(NgcRangeComponent) sliderComponent: NgcRangeComponent;

  constructor(private exerciseService: ExerciseService) {}

  ngAfterViewInit(): void {
    fromEvent(this.inputValorElement.nativeElement, 'blur').subscribe((res) => console.log(res));

    fromEvent(this.inputValorSuperiorElement.nativeElement, 'blur').subscribe((res) => console.log(res));
  }

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
        this.slideValores = Object.values(data);
      });
  }

  setValue(nuevoValor: number, tipoValor: TipoPunto) {
    console.log(tipoValor, this.sliderComponent);
    let newValues =
      tipoValor === TipoPunto.Min
        ? [Number(nuevoValor), this.slideValores[1]]
        : [this.slideValores[0], Number(nuevoValor)];
    this.slideValores = newValues;
  }

  onValorSuperiorCambio(event) {
    console.log(event);
  }

  getValue(value, i) {
    return value ? value[i] : null;
  }
}
