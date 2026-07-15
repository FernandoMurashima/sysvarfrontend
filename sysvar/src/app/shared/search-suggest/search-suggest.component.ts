import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-suggest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-suggest.component.html',
  styleUrls: ['./search-suggest.component.css']
})
export class SearchSuggestComponent {
  @Input() value = '';
  @Input() placeholder = 'Buscar...';
  @Input() suggestions: string[] = [];
  @Input() minChars = 1;
  @Input() maxItems = 8;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  open = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  get filteredSuggestions(): string[] {
    const term = this.normalize(this.value);
    if (term.length < this.minChars) return [];

    const seen = new Set<string>();
    return (this.suggestions || [])
      .map(item => String(item ?? '').trim())
      .filter(Boolean)
      .filter(item => {
        const key = this.normalize(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return key.includes(term);
      })
      .slice(0, this.maxItems);
  }

  onInput(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
    this.open = true;
  }

  onFocus(): void {
    this.open = true;
  }

  doSearch(): void {
    this.open = false;
    this.search.emit(this.value);
  }

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
    this.open = false;
    this.cleared.emit();
  }

  select(item: string): void {
    this.value = item;
    this.valueChange.emit(item);
    this.open = false;
    this.search.emit(item);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
