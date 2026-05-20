import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreditService } from '../../../core/services/credit.service';
import { CreditTransaction, CreditTransactionType } from '../../../core/models/credit.model';
import { formatDate } from '../../../core/utils/format.utils';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { TopBar } from '../../../shared/components/top-bar/top-bar';

@Component({
  selector: 'app-credit-history',
  imports: [RouterLink, Sidebar, TopBar],
  templateUrl: './credit-history.html',
})
export class CreditHistory implements OnInit {
  private readonly creditService = inject(CreditService);

  protected readonly transactions = signal<CreditTransaction[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly CreditTransactionType = CreditTransactionType;
  protected readonly formatDate = formatDate;

  ngOnInit(): void {
    this.creditService.findHistory().subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
