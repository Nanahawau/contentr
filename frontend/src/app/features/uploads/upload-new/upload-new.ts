import { Component, inject, signal, ElementRef, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { UploadService } from '../../../core/services/upload.service';
import { ConfigService } from '../../../core/services/config.service';
import { ALL_PLATFORMS, Platform, PLATFORM_LABELS, Upload } from '../../../core/models/upload.model';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { TopBar } from '../../../shared/components/top-bar/top-bar';

type UploadState = 'idle' | 'analysing' | 'warn' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-upload-new',
  imports: [RouterLink, Sidebar, TopBar],
  templateUrl: './upload-new.html',
})
export class UploadNew {
  private readonly uploadService = inject(UploadService);
  protected readonly configService = inject(ConfigService);
  private readonly router = inject(Router);

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedPlatforms = signal<Set<Platform>>(new Set());
  protected readonly isDragging = signal(false);
  protected readonly uploadState = signal<UploadState>('idle');
  protected readonly progress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly warningMessage = signal('');
  protected readonly qualityScore = signal(0);

  private pendingAnalysisToken = '';

  protected readonly allPlatforms = ALL_PLATFORMS;
  protected readonly platformLabels = PLATFORM_LABELS;

  protected get canUpload(): boolean {
    return this.selectedFile() !== null && this.selectedPlatforms().size > 0;
  }

  protected openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  protected togglePlatform(platform: Platform): void {
    const current = new Set(this.selectedPlatforms());
    if (current.has(platform)) {
      current.delete(platform);
    } else {
      current.add(platform);
    }
    this.selectedPlatforms.set(current);
  }

  protected isPlatformSelected(platform: Platform): boolean {
    return this.selectedPlatforms().has(platform);
  }

  protected submit(): void {
    const file = this.selectedFile();
    if (!file || !this.canUpload) return;

    this.uploadState.set('analysing');

    this.uploadService.analyse(file).subscribe({
      next: (result) => {
        if (result.band === 'warn') {
          this.pendingAnalysisToken = result.analysisToken;
          this.qualityScore.set(result.score);
          this.warningMessage.set(result.reason);
          this.uploadState.set('warn');
        } else {
          this.proceedWithUpload(file, result.analysisToken);
        }
      },
      error: (error) => {
        const reason = error.error?.reason ?? 'File did not pass quality check. Please try a different file.';
        this.uploadState.set('error');
        this.errorMessage.set(reason);
      },
    });
  }

  protected confirmUpload(): void {
    const file = this.selectedFile();
    if (!file || !this.pendingAnalysisToken) return;
    this.proceedWithUpload(file, this.pendingAnalysisToken);
  }

  protected cancelUpload(): void {
    this.pendingAnalysisToken = '';
    this.uploadState.set('idle');
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private proceedWithUpload(file: File, analysisToken: string): void {
    const platforms = Array.from(this.selectedPlatforms());
    this.uploadState.set('uploading');
    this.progress.set(0);

    this.uploadService.upload(file, platforms, analysisToken).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round((100 * event.loaded) / event.total));
        } else if (event instanceof HttpResponse) {
          this.uploadState.set('success');
          const upload = event.body as Upload;
          setTimeout(() => this.router.navigate(['/uploads', upload._id]), 1500);
        }
      },
      error: () => {
        this.uploadState.set('error');
        this.errorMessage.set('Upload failed. Please check your file and try again.');
      },
    });
  }

  private setFile(file: File): void {
    const maxBytes = this.configService.maxUploadSizeMb() * 1024 * 1024;
    if (file.size > maxBytes) {
      this.uploadState.set('error');
      this.errorMessage.set(`File too large. Maximum size is ${this.configService.maxUploadSizeMb()}MB.`);
      return;
    }
    this.selectedFile.set(file);
    this.uploadState.set('idle');
    this.errorMessage.set('');
  }
}
