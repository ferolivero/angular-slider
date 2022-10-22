import { ChangeDetectorRef, Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { NgcRangeElementoDirective } from './ngc-range-elemento.directive';

@Directive({
  selector: '[ngcRangeDeslizable]'
})
export class NgcRangeDeslizableDirective extends NgcRangeElementoDirective {
  active: boolean = false;

  constructor(elemRef: ElementRef, renderer: Renderer2, changeDetectionRef: ChangeDetectorRef) {
    super(elemRef, renderer, changeDetectionRef);
  }
}
