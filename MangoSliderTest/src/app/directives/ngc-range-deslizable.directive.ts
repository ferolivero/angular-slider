import { ChangeDetectorRef, Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { NgcRangeElementoDirective } from './ngc-range-elemento.directive';

@Directive({
  selector: '[customRangeHandle]'
})
export class NgcRangeDeslizableDirective extends NgcRangeElementoDirective {
  active: boolean = false;

  @HostBinding('attr.role')
  role: string = '';

  @HostBinding('attr.tabindex')
  tabindex: string = '';

  focus(): void {
    this.elemRef.nativeElement.focus();
  }

  constructor(elemRef: ElementRef, renderer: Renderer2, changeDetectionRef: ChangeDetectorRef) {
    super(elemRef, renderer, changeDetectionRef);
  }
}
