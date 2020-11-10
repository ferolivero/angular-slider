import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { SharedModule } from '../shared/shared.module';
import { NgcRangeComponent } from './../ngc-range/ngc-range.component';
import { Exercise1Component } from './exercise1.component';
import { CustomRangeHandleDirective } from './../directives/custom-range-handle.directive';
import { CustomRangeLabelDirective } from './../directives/custom-range-label.directive';

@NgModule({
  imports: [
    SharedModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: Exercise1Component
      }
    ])
  ],
  declarations: [
    Exercise1Component,
    NgcRangeComponent,
    CustomRangeElementDirective,
    CustomRangeHandleDirective,
    CustomRangeLabelDirective
  ]
})
export class Exercise1Module {}
