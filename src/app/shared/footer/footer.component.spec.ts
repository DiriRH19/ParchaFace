import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent] // ✅ Standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render emergency sections', () => {
    const el: HTMLElement = fixture.nativeElement;

    // Ajusta estos textos si tu HTML usa otros títulos
    const hasColombia = el.textContent?.toLowerCase().includes('colombia');
    const hasArmenia = el.textContent?.toLowerCase().includes('armenia');

    expect(hasColombia).toBeTrue();
    expect(hasArmenia).toBeTrue();
  });

  it('should include the main emergency line 123', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('123');
  });
});
