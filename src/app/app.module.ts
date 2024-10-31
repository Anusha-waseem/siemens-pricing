import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgxPaginationModule } from 'ngx-pagination';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SimpleNotificationsModule } from 'angular2-notifications';
import { ReactiveFormsModule } from '@angular/forms';
import { IncentiveSimulationComponent } from './incentive-simulation/incentive-simulation.component';
import { RouterModule, Routes } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts'; // Import NgApexchartsModule
import { HttpClientModule } from '@angular/common/http';
import { NgxChartsModule } from '@swimlane/ngx-charts'; // Import NgxChartsModule

const routes: Routes = [
  { path: '', component: AppComponent },  // Default route
  { path: 'incentive', component: IncentiveSimulationComponent },  // Incentive route
];

@NgModule({
  declarations: [
    AppComponent,
    IncentiveSimulationComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    HttpClientModule,
    NgxChartsModule,
    RouterModule.forRoot(routes)  // Set up routing,
  ]
    
   
  ,providers: [
    provideClientHydration()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
