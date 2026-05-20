import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyseResult, Platform, Upload, UploadsPage } from '../models/upload.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/uploads`;

  analyse(file: File, platforms: Platform[]): Observable<AnalyseResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platforms', JSON.stringify(platforms));
    return this.httpClient.post<AnalyseResult>(`${this.baseUrl}/analyse`, formData);
  }

  confirm(analysisToken: string): Observable<Upload> {
    return this.httpClient.post<Upload>(`${this.baseUrl}/confirm`, { analysisToken });
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
