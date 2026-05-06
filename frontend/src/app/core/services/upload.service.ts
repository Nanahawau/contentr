import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Platform, Upload, UploadsPage } from '../models/upload.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/uploads`;

  upload(file: File, platforms: Platform[]): Observable<HttpEvent<Upload>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platforms', JSON.stringify(platforms));

    return this.httpClient.post<Upload>(this.baseUrl, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  findAll(limit = 20, cursor?: string): Observable<UploadsPage> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (cursor) params['cursor'] = cursor;
    return this.httpClient.get<UploadsPage>(this.baseUrl, { params });
  }

  findOne(id: string): Observable<Upload> {
    return this.httpClient.get<Upload>(`${this.baseUrl}/${id}`);
  }
}
