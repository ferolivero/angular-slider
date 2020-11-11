import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { CustomRangeHandleDirective } from '../directives/custom-range-handle.directive';
import { CustomRangeLabelDirective } from '../directives/custom-range-label.directive';
import { NgcRangeComponent } from '../ngc-range/ngc-range.component';

@NgModule({
  imports: [CommonModule],
  exports: [
    CommonModule,
    NgcRangeComponent,
    CustomRangeElementDirective,
    CustomRangeHandleDirective,
    CustomRangeLabelDirective
  ],
  declarations: [
    NgcRangeComponent,
    CustomRangeElementDirective,
    CustomRangeHandleDirective,
    CustomRangeLabelDirective
  ]
})
export class SharedModule {}
