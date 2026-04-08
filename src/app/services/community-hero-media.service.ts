import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../config/api.config';

export type CommunityHeroSlot = 'PARTY' | 'ORGANIZE' | 'CONNECT';

export interface CommunityHeroMediaResponse {
  slot: CommunityHeroSlot;
  imageUrl: string;
  altText?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CommunityHeroMediaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<CommunityHeroMediaResponse[]> {
    return this.http.get<CommunityHeroMediaResponse[]>(
      buildApiUrl('/api/community/hero-media')
    );
  }

  subir(slot: CommunityHeroSlot, image: File, altText?: string): Observable<CommunityHeroMediaResponse> {
    const formData = new FormData();
    formData.append('image', image, image.name);

    if (altText?.trim()) {
      formData.append('altText', altText.trim());
    }

    return this.http.post<CommunityHeroMediaResponse>(
      buildApiUrl(`/api/community/hero-media/${slot}`),
      formData
    );
  }

  eliminar(slot: CommunityHeroSlot): Observable<void> {
    return this.http.delete<void>(
      buildApiUrl(`/api/community/hero-media/${slot}`)
    );
  }
}
