import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EstoqueMovimentacao } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-estoque-movimentacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './estoque-movimentacoes.component.html',
  styleUrls: ['./estoque-movimentacoes.component.css']
})
export class EstoqueMovimentacoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);
  loading = false;
  saving = false;
  showForm = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  lojas: Loja[] = [];
  movimentos: EstoqueMovimentacao[] = [];
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('estoque', true) !== false; }
  get searchSuggestions(): string[] {
    const valores = this.movimentos.flatMap(m => [
      m.documento,
      m.referencia,
      m.CodigodeBarra,
      this.lojaNome(m.Idloja),
      m.tipo
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }
  form = this.fb.group({
    Idloja: [null as number | null, Validators.required],
    CodigodeBarra: ['', [Validators.required, Validators.minLength(13), Validators.maxLength(13)]],
    tipo: ['ENTRADA', Validators.required],
    quantidade: [1, [Validators.required]],
    documento: [''],
    observacao: ['']
  });

  ngOnInit(): void { this.load(); }

  clearSearch(): void {
    this.search = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500 }),
      movs: this.api.listMovimentacoes({ search: this.search, page_size: 5000 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.movimentos = this.unwrap<EstoqueMovimentacao>(res.movs);
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar movimentações.'; }
    });
  }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.form.reset({ Idloja: this.lojas[0]?.id ?? null, CodigodeBarra: '', tipo: 'ENTRADA', quantidade: 1, documento: '', observacao: '' });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    if (this.form.invalid) { this.errorMsg = 'Revise os campos obrigatórios.'; return; }
    this.saving = true;
    const raw = this.form.value;
    this.api.createMovimentacao({
      Idloja: Number(raw.Idloja),
      CodigodeBarra: String(raw.CodigodeBarra || '').trim(),
      tipo: raw.tipo as any,
      quantidade: Number(raw.quantidade || 0),
      documento: String(raw.documento || '').trim() || null,
      observacao: String(raw.observacao || '').trim() || null
    }).subscribe({
      next: () => { this.saving = false; this.successMsg = 'Movimentação lançada.'; this.showForm = false; this.load(); },
      error: () => { this.saving = false; this.errorMsg = 'Falha ao lançar movimentação.'; }
    });
  }

  lojaNome(id: number): string { return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`; }

  money(value: number | string | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private unwrap<T>(res: any): T[] { return Array.isArray(res) ? res : (res?.results ?? []); }
}
