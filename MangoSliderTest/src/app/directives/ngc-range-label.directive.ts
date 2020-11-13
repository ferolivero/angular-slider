import { ChangeDetectorRef, Directive, ElementRef, Renderer2 } from '@angular/core';
import { NgcRangeElementoDirective } from './ngc-range-elemento.directive';

@Directive({
  selector: '[ngcRangeLabel]'
})
export class NgcRangeLabelDirective extends NgcRangeElementoDirective {
  private _value: string = null;
  get value(): string {
    return this._value;
  }

  constructor(elemRef: ElementRef, renderer: Renderer2, changeDetectionRef: ChangeDetectorRef) {
    super(elemRef, renderer, changeDetectionRef);
  }

  setValue(value: string): void {
    this._value = value;
    this.elemRef.nativeElement.innerHTML = value;
  }
}
