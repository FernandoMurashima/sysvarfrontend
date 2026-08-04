import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CoresComponent } from './cores.component';

describe('CoresComponent', () => {
  let component: CoresComponent;
  let fixture: ComponentFixture<CoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoresComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
