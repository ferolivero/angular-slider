import { ChangeDetectorRef, Directive, ElementRef, Renderer2 } from '@angular/core';
import { CustomRangeElementDirective } from './custom-range-element.directive';

@Directive({
  selector: '[customRangeLabel]'
})
export class CustomRangeLabelDirective extends CustomRangeElementDirective {
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
