import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  @Input() title = 'Nenhum registro encontrado.';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() showAction = false;
  @Output() action = new EventEmitter<void>();
}
