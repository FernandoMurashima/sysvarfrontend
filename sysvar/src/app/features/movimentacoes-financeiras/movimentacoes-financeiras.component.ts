import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { Loja } from '../../core/models/loja';
import { MovimentacaoFinanceira } from '../../core/models/movimentacao-financeira';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { CaixasService } from '../../core/services/caixas.service';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';

@Component({
  selector: 'app-movimentacoes-financeiras',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './movimentacoes-financeiras.component.html',
  styleUrls: ['./movimentacoes-financeiras.component.css']
})
export class MovimentacoesFinanceirasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(MovimentacoesFinanceirasService);
  private lojasApi = inject(LojasService);
  private caixasApi = inject(CaixasService);
  private contasApi = inject(ContasBancariasService);
  private naturezaApi = inject(NatLancamentosService);
  private formasApi = inject(FormasPagamentoService);

  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  search = '';
  errorMsg = '';
  successMsg = '';

  movimentacoes: MovimentacaoFinanceira[] = [];
  lojas: Loja[] = [];
  caixas: Caixa[] = [];
  contas: ContaBancaria[] = [];
  naturezas: NatLancamento[] = [];
  formas: FormaPagamento[] = [];

  form = this.fb.group({
    idloja: [null as number | null, Validators.required],
    data_movimento: [this.today(), Validators.required],
    tipo: ['ENTRADA', Validators.required],
    status: ['EFETIVA', Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    historico: ['', [Validators.required, Validators.maxLength(255)]],
    documento: [''],
    Idnatureza: [null as number | null],
    FormaPagamento: [''],
    destino_tipo: ['CAIXA', Validators.required],
    caixa: [null as number | null],
    conta_bancaria: [null as number | null]
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      caixas: this.caixasApi.list({ ativo: true }),
      contas: this.contasApi.list({ ativo: true }),
      naturezas: this.naturezaApi.list(),
      formas: this.formasApi.list({ ativo: true }),
      movimentacoes: this.api.list()
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixas = this.unwrap<Caixa>(res.caixas);
        this.contas = this.unwrap<ContaBancaria>(res.contas);
        this.naturezas = this.unwrap<NatLancamento>(res.naturezas);
        this.formas = this.unwrap<FormaPagamento>(res.formas);
        this.movimentacoes = this.filter(this.unwrap<MovimentacaoFinanceira>(res.movimentacoes));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar movimentações.';
      }
    });
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      data_movimento: this.today(),
      tipo: 'ENTRADA',
      status: 'EFETIVA',
      valor: 0,
      historico: '',
      documento: '',
      Idnatureza: null,
      FormaPagamento: '',
      destino_tipo: 'CAIXA',
      caixa: this.caixas[0]?.Idcaixa ?? null,
      conta_bancaria: null
    });
  }

  editar(item: MovimentacaoFinanceira): void {
    this.showForm = true;
    this.editingId = item.Idmovimentacao ?? null;
    this.form.reset({
      idloja: item.idloja,
      data_movimento: item.data_movimento,
      tipo: item.tipo,
      status: item.status,
      valor: Number(item.valor),
      historico: item.historico,
      documento: item.documento ?? '',
      Idnatureza: item.Idnatureza ?? null,
      FormaPagamento: item.FormaPagamento ?? '',
      destino_tipo: item.caixa ? 'CAIXA' : 'CONTA',
      caixa: item.caixa ?? null,
      conta_bancaria: item.conta_bancaria ?? null
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.errorMsg = 'Revise os campos obrigatórios.';
      return;
    }
    const raw = this.form.value;
    const destinoTipo = String(raw.destino_tipo);
    const payload: Partial<MovimentacaoFinanceira> = {
      idloja: Number(raw.idloja),
      data_movimento: String(raw.data_movimento),
      tipo: raw.tipo as any,
      status: raw.status as any,
      origem: 'MANUAL',
      valor: Number(raw.valor || 0),
      historico: String(raw.historico || '').trim(),
      documento: String(raw.documento || '').trim() || null,
      Idnatureza: raw.Idnatureza ? Number(raw.Idnatureza) : null,
      FormaPagamento: String(raw.FormaPagamento || '').trim() || null,
      caixa: destinoTipo === 'CAIXA' ? Number(raw.caixa) : null,
      conta_bancaria: destinoTipo === 'CONTA' ? Number(raw.conta_bancaria) : null
    };
    if (!payload.caixa && !payload.conta_bancaria) {
      this.errorMsg = 'Informe o caixa ou a conta bancária.';
      return;
    }
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Movimentação salva.';
        this.cancelar();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar movimentação.';
      }
    });
  }

  cancelarMov(item: MovimentacaoFinanceira): void {
    const id = item.Idmovimentacao;
    if (!id || !confirm('Cancelar esta movimentação?')) return;
    this.api.cancelar(id).subscribe({
      next: () => {
        this.successMsg = 'Movimentação cancelada.';
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao cancelar movimentação.'
    });
  }

  excluir(item: MovimentacaoFinanceira): void {
    const id = item.Idmovimentacao;
    if (!id || !confirm('Excluir esta movimentação?')) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Movimentação excluída.';
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao excluir movimentação.'
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  destinoNome(item: MovimentacaoFinanceira): string {
    if (item.caixa) return this.caixas.find(c => c.Idcaixa === item.caixa)?.descricao || `Caixa #${item.caixa}`;
    if (item.conta_bancaria) return this.contas.find(c => c.Idconta === item.conta_bancaria)?.descricao || `Conta #${item.conta_bancaria}`;
    return '-';
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  private filter(items: MovimentacaoFinanceira[]): MovimentacaoFinanceira[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(m =>
      m.historico.toLowerCase().includes(q) ||
      (m.documento || '').toLowerCase().includes(q) ||
      this.destinoNome(m).toLowerCase().includes(q)
    );
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
