import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Event-cardComponent } from './event-card.component';

describe('Event-cardComponent', () => {
  let component: Event-cardComponent;
  let fixture: ComponentFixture<Event-cardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Event-cardComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Event-cardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
