import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgcRangeComponent } from './ngc-range.component';

describe('NgcRangeComponent', () => {
  let component: NgcRangeComponent;
  let fixture: ComponentFixture<NgcRangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NgcRangeComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgcRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
