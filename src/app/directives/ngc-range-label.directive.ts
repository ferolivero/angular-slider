import { ChangeDetectorRef, Directive, ElementRef, Renderer2 } from '@angular/core';
import { NgcRangeElementoDirective } from './ngc-range-elemento.directive';

@Directive({
  selector: '[ngcRangeLabel]'
})
export class NgcRangeLabelDirective extends NgcRangeElementoDirective {
  private _valor: string = null;
  get valor(): string {
    return this._valor;
  }

  constructor(elemRef: ElementRef, renderer: Renderer2, changeDetectionRef: ChangeDetectorRef) {
    super(elemRef, renderer, changeDetectionRef);
  }

  setValor(nuevoValor: string): void {
    this._valor = nuevoValor;
    this.elemRef.nativeElement.innerHTML = nuevoValor;
  }
}
