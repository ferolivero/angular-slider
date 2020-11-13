import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgcRangeDeslizableDirective } from '../directives/ngc-range-deslizable.directive';
import { NgcRangeElementoDirective } from '../directives/ngc-range-elemento.directive';
import { NgcRangeLabelDirective } from '../directives/ngc-range-label.directive';
import { NgcRangeComponent } from './ngc-range.component';

describe('NgcRangeComponent', () => {
  let component: NgcRangeComponent;
  let fixture: ComponentFixture<NgcRangeComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule],
      declarations: [
        NgcRangeComponent,
        NgcRangeElementoDirective,
        NgcRangeDeslizableDirective,
        NgcRangeLabelDirective
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgcRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deberia crear correctamente el componente', () => {
    expect(component).toBeTruthy();
  });

  it('Deberia inicializar los valores inferiores y superiores con 1 y 10', () => {
    component.min = 1;
    component.max = 10;
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(component.valor).toBe(1);
    expect(component.valorSuperior).toBe(10);
  });

  it('Deberia inicializar los valores inferiores y superiores con 2 y 8.', () => {
    component.min = 1;
    component.max = 10;
    component.slideValores = [2, 8];
    component.ngOnInit();
    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component.valor).toBe(2);
    expect(component.valorSuperior).toBe(8);
  });

  it('Deberia limitar el maximo a 10.', () => {
    component.min = 1;
    component.max = 10;
    component.slideValores = [2, 25];
    component.ngOnInit();
    component.ngAfterViewInit();
    component.writeValue([2, 25]);
    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component.valor).toBe(2);
    expect(component.valorSuperior).toBe(10);
  });

  it('Deberia limitar el valor inferior al minimo.', () => {
    component.min = 1;
    component.max = 10;
    component.slideValores = [-50, 5];
    component.ngOnInit();
    component.ngAfterViewInit();
    component.writeValue([-50, 5]);
    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component.valor).toBe(1);
    expect(component.valorSuperior).toBe(5);
  });

  it('Deberia inicializar los valores inferiores y superiores con 1 y 10. Tipo Rango Fixed', () => {
    component.type = 'fixed';
    component.values = [1, 10];
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(component.valor).toBe(1);
    expect(component.valorSuperior).toBe(10);
  });

  it('Deberia inicializar los valores inferiores y superiores con 2 y 8. Tipo Rango Fixed', () => {
    component.type = 'fixed';
    component.slideValores = [2, 8];
    component.values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    component.ngOnInit();
    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component.valor).toBe(2);
    expect(component.valorSuperior).toBe(8);
  });

  it('Deberia limitar el maximo a 10. Tipo Rango Fixed', () => {
    component.type = 'fixed';
    component.slideValores = [2, 50];
    component.values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    component.ngOnInit();
    component.ngAfterViewInit();
    component.writeValue([2, 50]);
    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component.valor).toBe(2);
    expect(component.valorSuperior).toBe(10);
  });
});
