import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { Exercise2Component } from './exercise2.component';

@NgModule({
  imports: [
    SharedModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: Exercise2Component
      }
    ])
  ],
  declarations: [Exercise2Component]
})
export class Exercise2Module {}
