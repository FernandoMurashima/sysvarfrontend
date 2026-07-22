import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() tooltip = '';
  @Input() variant: 'success' | 'muted' | 'danger' | 'info' | 'warning' | 'purple' = 'muted';
}
