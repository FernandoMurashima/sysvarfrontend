import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LojasService } from '../../core/services/lojas.service';

export interface Loja {
  Idloja?: number;      // pode vir Idloja
  id?: number;          // ou id
  nome_loja?: string;
  Nome_loja?: string;
  apelido_loja?: string;
  Apelido_loja?: string;
}

@Component({
  selector: 'app-lojas-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lojas-selector.component.html',
  styleUrls: ['./lojas-selector.component.css']
})
export class LojasSelectorComponent implements OnInit {
  private lojasSvc = inject(LojasService);

  lojas: Loja[] = [];

  /** IDs selecionados */
  @Input() selected: number[] = [];
  @Output() selectedChange = new EventEmitter<number[]>();

  /** Se true, ao clicar em qualquer loja marca TODAS (opcional) */
  @Input() selectAllOnClick = false;

  loading = signal(false);
  erro = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.lojasSvc.list().subscribe({
      next: (data: any) => {
        this.lojas = Array.isArray(data) ? data : (data?.results ?? []);
      },
      error: () => this.erro.set('Falha ao carregar lojas'),
      complete: () => this.loading.set(false),
    });
  }

  /** precisa ser pública para o template */
  getId(l: Loja | any): number | null {
    if (typeof l?.Idloja === 'number') return l.Idloja;
    if (typeof l?.id === 'number') return l.id;
    return null;
  }

  onCheckboxChange(event: Event, loja: Loja): void {
    const input = event.target as HTMLInputElement | null;
    const checked = !!input?.checked;

    const id = this.getId(loja);
    if (id == null) return;

    if (this.selectAllOnClick) {
      if (checked) {
        const todos = this.lojas
          .map(x => this.getId(x))
          .filter((v): v is number => typeof v === 'number');
        this.selected = todos;
      } else {
        this.selected = [];
      }
      this.selectedChange.emit(this.selected);
      return;
    }

    this.toggle(id, checked);
  }

  private toggle(lojaId: number, checked: boolean): void {
    const set = new Set<number>(this.selected);
    checked ? set.add(lojaId) : set.delete(lojaId);
    this.selected = Array.from(set.values());
    this.selectedChange.emit(this.selected);
  }
}
