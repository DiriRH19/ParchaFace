import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PreferenciasComponent } from './preferencias';
import { PreferencesService } from '../services/preferences.service';

describe('PreferenciasComponent', () => {
  let component: PreferenciasComponent;
  let fixture: ComponentFixture<PreferenciasComponent>;
  let preferencesService: jasmine.SpyObj<PreferencesService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const preferencesServiceSpy = jasmine.createSpyObj('PreferencesService', ['getPreferencesFromApi', 'savePreferences', 'hasCompletedPreferences'], {
      categories: ['Música', 'Gaming', 'Fiestas', 'Networking', 'Deportes', 'Gastronomía']
    });
    preferencesServiceSpy.getPreferencesFromApi.and.returnValue(of({ completed: false, categories: [] }));
    preferencesServiceSpy.savePreferences.and.returnValue(of({ completed: true, categories: ['Música'] }));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [PreferenciasComponent],
      providers: [
        { provide: PreferencesService, useValue: preferencesServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    preferencesService = TestBed.inject(PreferencesService) as jasmine.SpyObj<PreferencesService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PreferenciasComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    fixture.detectChanges();
    expect(preferencesService.getPreferencesFromApi).toHaveBeenCalled();
  });

  it('should toggle category selection', () => {
    fixture.detectChanges();
    expect(component.isSelected('Música')).toBe(false);
    component.toggle('Música');
    expect(component.isSelected('Música')).toBe(true);
    component.toggle('Música');
    expect(component.isSelected('Música')).toBe(false);
  });

  it('should not allow continue with no categories selected', () => {
    fixture.detectChanges();
    expect(component.canContinue()).toBe(false);
  });

  it('should allow continue when at least one category is selected', () => {
    fixture.detectChanges();
    component.toggle('Música');
    expect(component.canContinue()).toBe(true);
  });
});
