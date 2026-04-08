import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { EventCardComponent } from './event-card.component';
import { WeatherService } from '../services/weather.service';

describe('EventCardComponent', () => {
  let component: EventCardComponent;
  let fixture: ComponentFixture<EventCardComponent>;
  let weatherServiceSpy: jasmine.SpyObj<WeatherService>;

  beforeEach(async () => {
    weatherServiceSpy = jasmine.createSpyObj('WeatherService', ['getClima']);
    weatherServiceSpy.getClima.and.returnValue(
      of({
        temperaturaC: 24,
        vientoKmh: 10
      } as any)
    );

    await TestBed.configureTestingModule({
      imports: [EventCardComponent],
      providers: [
        { provide: WeatherService, useValue: weatherServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventCardComponent);
    component = fixture.componentInstance;
  });

  function setDefaultEvent() {
    component.event = {
      id: 1,
      title: 'Evento de prueba',
      description: 'Descripción de prueba',
      date: '2026-03-18 18:00',
      location: 'Parque principal',
      ciudad: 'Bogotá',
      attendees: '20 asistentes',
      category: 'MUSICA',
      tags: ['música'],
      price: 'Gratis',
      rating: 4.5,
      imageUrl: ''
    };
  }

  it('should create', () => {
    setDefaultEvent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call weather service when ciudad exists', () => {
    setDefaultEvent();
    fixture.detectChanges();

    expect(weatherServiceSpy.getClima).toHaveBeenCalledWith('Bogotá');
    expect(component.climaLoading).toBeFalse();
    expect(component.climaError).toBeFalse();
  });

  it('should not call weather service when ciudad is empty', () => {
    setDefaultEvent();
    component.event.ciudad = '';
    fixture.detectChanges();

    expect(weatherServiceSpy.getClima).not.toHaveBeenCalled();
    expect(component.clima).toBeNull();
  });

  it('should handle weather service error', () => {
    weatherServiceSpy.getClima.and.returnValue(
      throwError(() => new Error('weather error'))
    );

    setDefaultEvent();
    fixture.detectChanges();

    expect(component.clima).toBeNull();
    expect(component.climaError).toBeTrue();
    expect(component.climaLoading).toBeFalse();
  });

  it('should clear imageUrl on image error', () => {
    setDefaultEvent();
    component.event.imageUrl = 'https://example.com/img.jpg';

    component.onImgError();

    expect(component.event.imageUrl).toBe('');
  });
});
