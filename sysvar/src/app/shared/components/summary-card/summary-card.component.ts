import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-card.component.html',
  styleUrls: ['./summary-card.component.css']
})
export class SummaryCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() icon = '□';
  @Input() percentage = '';
  @Input() helperText = '';
  @Input() variant: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'gray' = 'blue';
  @Input() loading = false;
}
