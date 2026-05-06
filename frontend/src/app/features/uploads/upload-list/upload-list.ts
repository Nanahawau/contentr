import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UploadService } from '../../../core/services/upload.service';
import { PLATFORM_LABELS, Upload } from '../../../core/models/upload.model';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { TopBar } from '../../../shared/components/top-bar/top-bar';

@Component({
  selector: 'app-upload-list',
  imports: [RouterLink, Sidebar, TopBar],
  templateUrl: './upload-list.html',
})
export class UploadList implements OnInit {
  private readonly uploadService = inject(UploadService);

  protected readonly uploads = signal<Upload[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingMore = signal(false);
  protected readonly platformLabels = PLATFORM_LABELS;

  ngOnInit(): void {
    this.uploadService.findAll().subscribe({
      next: (page) => {
        this.uploads.set(page.uploads);
        this.nextCursor.set(page.nextCursor);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.isLoadingMore()) return;

    this.isLoadingMore.set(true);
    this.uploadService.findAll(20, cursor).subscribe({
      next: (page) => {
        this.uploads.update((current) => [...current, ...page.uploads]);
        this.nextCursor.set(page.nextCursor);
        this.isLoadingMore.set(false);
      },
      error: () => this.isLoadingMore.set(false),
    });
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
