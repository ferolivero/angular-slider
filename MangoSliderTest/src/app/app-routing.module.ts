import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';

const routes: Routes = [];

@NgModule({
  imports: [
    RouterModule.forRoot([
      { path: 'welcome', component: HomeComponent },
      {
        path: 'exercise1',
        loadChildren: () => import('./exercise1/exercise1.module').then((m) => m.Exercise1Module)
      },
      {
        path: 'exercise2',
        loadChildren: () => import('./exercise2/exercise2.module').then((m) => m.Exercise2Module)
      },
      { path: '', redirectTo: 'welcome', pathMatch: 'full' }
    ])
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
