import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.html',
})
export class TopBar {
  protected readonly authService = inject(AuthService);
}
