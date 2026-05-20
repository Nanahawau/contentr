import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UploadService } from '../../../core/services/upload.service';
import { PLATFORM_LABELS, Upload, UploadStatus } from '../../../core/models/upload.model';
import { formatBytes, formatDate } from '../../../core/utils/format.utils';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { TopBar } from '../../../shared/components/top-bar/top-bar';

@Component({
  selector: 'app-upload-detail',
  imports: [RouterLink, Sidebar, TopBar],
  templateUrl: './upload-detail.html',
})
export class UploadDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly uploadService = inject(UploadService);

  protected readonly upload = signal<Upload | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly platformLabels = PLATFORM_LABELS;
  protected readonly UploadStatus = UploadStatus;
  protected readonly formatBytes = formatBytes;
  protected readonly formatDate = formatDate;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    this.uploadService.findOne(id).subscribe({
      next: (upload) => {
        this.upload.set(upload);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
