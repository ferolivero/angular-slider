import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { Exercise1Component } from './exercise1.component';

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
  declarations: [Exercise1Component]
})
export class Exercise1Module {}
