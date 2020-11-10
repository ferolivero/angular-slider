import { Directive, ElementRef, Renderer2, HostBinding, ChangeDetectorRef } from '@angular/core';
import { CustomRangeElementDirective } from './custom-range-element.directive';

@Directive({
  selector: '[customRangeHandle]'
})
export class CustomRangeHandleDirective extends CustomRangeElementDirective {
  @HostBinding('class.ngx-slider-active')
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
