import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface RowAction {
  key: string;
  label: string;
  icon?: string;
  visible?: boolean;
  disabled?: boolean;
  danger?: boolean;
  dividerBefore?: boolean;
}

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './row-actions-menu.component.html',
  styleUrls: ['./row-actions-menu.component.css']
})
export class RowActionsMenuComponent {
  @Input() actions: RowAction[] = [];
  @Input() ariaLabel = 'Abrir ações';
  @Output() action = new EventEmitter<string>();

  open = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  get visibleActions(): RowAction[] {
    return this.actions.filter(a => a.visible !== false);
  }

  choose(item: RowAction): void {
    if (item.disabled) return;
    this.open = false;
    this.action.emit(item.key);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }
}
