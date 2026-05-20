import { Component, inject, signal, computed, ElementRef, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';
import { ALL_PLATFORMS, CreditEstimate, Platform, PLATFORM_LABELS, QualityBand, Upload, UploadStatus } from '../../../core/models/upload.model';
import { formatBytes } from '../../../core/utils/format.utils';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { TopBar } from '../../../shared/components/top-bar/top-bar';

type UploadState = 'idle' | 'analysing' | 'confirming' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-upload-new',
  imports: [RouterLink, Sidebar, TopBar],
  templateUrl: './upload-new.html',
})
export class UploadNew {
  private readonly uploadService = inject(UploadService);
  protected readonly authService = inject(AuthService);
  protected readonly configService = inject(ConfigService);
  private readonly router = inject(Router);

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedPlatforms = signal<Set<Platform>>(new Set());
  protected readonly isDragging = signal(false);
  protected readonly uploadState = signal<UploadState>('idle');
  protected readonly errorMessage = signal('');
  protected readonly qualityScore = signal(0);
  protected readonly qualityBand = signal<QualityBand>(QualityBand.PASS);
  protected readonly warningMessage = signal('');
  protected readonly creditEstimate = signal<CreditEstimate | null>(null);

  protected readonly balanceAfter = computed(() => {
    const balance = this.authService.currentUser()?.credits.balance ?? 0;
    const cost = this.creditEstimate()?.total ?? 0;
    return balance - cost;
  });

  private pendingAnalysisToken = '';

  protected readonly allPlatforms = ALL_PLATFORMS;
  protected readonly platformLabels = PLATFORM_LABELS;
  protected readonly QualityBand = QualityBand;

  protected get canSubmit(): boolean {
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
    if (!file || !this.canSubmit) return;

    this.uploadState.set('analysing');
    const platforms = Array.from(this.selectedPlatforms());

    this.uploadService.analyse(file, platforms).subscribe({
      next: (result) => {
        this.pendingAnalysisToken = result.analysisToken;
        this.qualityScore.set(result.score);
        this.qualityBand.set(result.band);
        this.warningMessage.set(result.reason);
        this.creditEstimate.set(result.creditEstimate);
        this.uploadState.set('confirming');
      },
      error: (error) => {
        const reason = error.error?.reason ?? 'File did not pass quality check. Please try a different file.';
        this.uploadState.set('error');
        this.errorMessage.set(reason);
      },
    });
  }

  protected confirmUpload(): void {
    if (!this.pendingAnalysisToken) return;
    this.uploadState.set('submitting');

    this.uploadService.confirm(this.pendingAnalysisToken).subscribe({
      next: (upload: Upload) => {
        this.uploadState.set('success');
        this.authService.fetchMe().subscribe();
        setTimeout(() => this.router.navigate(['/uploads', upload._id]), 1500);
      },
      error: (error) => {
        this.uploadState.set('error');
        const message = error.error?.message ?? 'Upload failed. Please try again.';
        this.errorMessage.set(message);
      },
    });
  }

  protected cancelUpload(): void {
    this.pendingAnalysisToken = '';
    this.creditEstimate.set(null);
    this.uploadState.set('idle');
  }

  protected readonly formatBytes = formatBytes;

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
