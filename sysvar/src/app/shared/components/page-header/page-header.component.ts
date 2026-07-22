import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.css']
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() primaryActionLabel = '';
  @Input() primaryActionIcon = '+';
  @Input() showPrimaryAction = false;
  @Input() disabled = false;
  @Input() breadcrumbs: string[] = [];
  @Output() primaryAction = new EventEmitter<void>();
}
