import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgcRangeElementoDirective } from '../directives/ngc-range-elemento.directive';
import { NgcRangeDeslizableDirective } from '../directives/ngc-range-deslizable.directive';
import { NgcRangeLabelDirective } from '../directives/ngc-range-label.directive';
import { NgcRangeComponent } from '../ngc-range/ngc-range.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [
    CommonModule,
    NgcRangeComponent,
    NgcRangeElementoDirective,
    NgcRangeDeslizableDirective,
    NgcRangeLabelDirective
  ],
  declarations: [
    NgcRangeComponent,
    NgcRangeElementoDirective,
    NgcRangeDeslizableDirective,
    NgcRangeLabelDirective
  ]
})
export class SharedModule {}
