import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'welcome-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome-banner.html',
  styleUrl: './welcome-banner.scss',
})
export class WelcomeBanner {
  readonly nombre = input('');
  readonly subtitulo = input('');
}
