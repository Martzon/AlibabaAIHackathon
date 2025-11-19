import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicalAnalysisPage } from './medical-analysis.page';

describe('MedicalAnalysisPage', () => {
  let component: MedicalAnalysisPage;
  let fixture: ComponentFixture<MedicalAnalysisPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicalAnalysisPage]
    }).compileComponents();
    
    fixture = TestBed.createComponent(MedicalAnalysisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});