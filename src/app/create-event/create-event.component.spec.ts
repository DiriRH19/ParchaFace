import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Create-eventComponent } from './create-event.component';

describe('Create-eventComponent', () => {
  let component: Create-eventComponent;
  let fixture: ComponentFixture<Create-eventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Create-eventComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Create-eventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
