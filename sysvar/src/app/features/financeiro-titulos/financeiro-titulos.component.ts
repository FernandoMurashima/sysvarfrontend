import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { Cliente } from '../../core/models/clientes';
import { Fornecedor } from '../../core/models/fornecedor';
import { Loja } from '../../core/models/loja';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { ParcelaFinanceira, TipoTituloFinanceiro, TituloFinanceiro } from '../../core/models/financeiro-titulo';
import { ClientesService } from '../../core/services/clientes.service';
import { FinanceiroTitulosService } from '../../core/services/financeiro-titulos.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { FormaPagamento } from '../../core/models/forma-pagamento';

@Component({
  selector: 'app-financeiro-titulos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './financeiro-titulos.component.html',
  styleUrls: ['./financeiro-titulos.component.css']
})
export class FinanceiroTitulosComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private api = inject(FinanceiroTitulosService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);
  private clientesApi = inject(ClientesService);
  private naturezaApi = inject(NatLancamentosService);
  private formasApi = inject(FormasPagamentoService);
  private sub?: Subscription;

  tipo: TipoTituloFinanceiro = 'pagar';
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  search = '';
  successMsg = '';
  errorMsg = '';

  titulos: TituloFinanceiro[] = [];
  lojas: Loja[] = [];
  fornecedores: Fornecedor[] = [];
  clientes: Cliente[] = [];
  naturezas: NatLancamento[] = [];
  formas: FormaPagamento[] = [];

  form: FormGroup = this.fb.group({
    idloja: [null, Validators.required],
    parceiro: [null, Validators.required],
    Titulo: ['', [Validators.required, Validators.maxLength(60)]],
    Documento: [''],
    Data_emissao: [this.today(), Validators.required],
    Valor_total: [0, [Validators.required, Validators.min(0.01)]],
    Previsao: [false],
    FormaPagamento: [''],
    Idnatureza: [null, Validators.required],
    conta_contabil: [''],
    parcelas: this.fb.array([])
  });

  get parcelasFA(): FormArray {
    return this.form.get('parcelas') as FormArray;
  }

  get tituloPagina(): string {
    return this.tipo === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber';
  }

  get parceiroLabel(): string {
    return this.tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
  }

  ngOnInit(): void {
    this.loadAuxiliares();
    this.sub = this.route.data.subscribe(data => {
      this.tipo = (data['tipo'] as TipoTituloFinanceiro) || 'pagar';
      this.cancelar();
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadAuxiliares(): void {
    forkJoin({
      lojas: this.lojasApi.list(),
      fornecedores: this.fornecedoresApi.list(),
      clientes: this.clientesApi.list(),
      naturezas: this.naturezaApi.list(),
      formas: this.formasApi.list({ ativo: true })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.fornecedores = this.unwrap<Fornecedor>(res.fornecedores);
        this.clientes = this.unwrap<Cliente>(res.clientes);
        this.naturezas = this.unwrap<NatLancamento>(res.naturezas);
        this.formas = this.unwrap<FormaPagamento>(res.formas);
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar cadastros auxiliares.';
      }
    });
  }

  load(): void {
    this.loading = true;
    this.api.list(this.tipo).subscribe({
      next: res => {
        const all = this.unwrap<TituloFinanceiro>(res);
        const q = this.search.trim().toLowerCase();
        this.titulos = q
          ? all.filter(t =>
              (t.Titulo || '').toLowerCase().includes(q) ||
              (t.Documento || '').toLowerCase().includes(q) ||
              this.parceiroNome(t).toLowerCase().includes(q)
            )
          : all;
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.titulos = [];
        this.loading = false;
        this.errorMsg = `Falha ao carregar ${this.tituloPagina.toLowerCase()}.`;
      }
    });
  }

  novo(): void {
    this.showForm = true;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      parceiro: null,
      Titulo: '',
      Documento: '',
      Data_emissao: this.today(),
      Valor_total: 0,
      Previsao: false,
      FormaPagamento: '',
      Idnatureza: this.naturezas[0]?.idnatureza ?? null,
      conta_contabil: ''
    });
    this.clearParcelas();
    this.addParcela();
  }

  cancelar(): void {
    this.showForm = false;
    this.submitted = false;
    this.clearParcelas();
  }

  addParcela(): void {
    this.parcelasFA.push(this.fb.group({
      parcela_n: [this.parcelasFA.length + 1, [Validators.required, Validators.min(1)]],
      Data_vencimento: [this.today(), Validators.required],
      valor_parcela: [0, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeParcela(index: number): void {
    this.parcelasFA.removeAt(index);
    this.parcelasFA.controls.forEach((ctrl, i) => ctrl.get('parcela_n')?.setValue(i + 1));
  }

  gerarParcelas(qtd: number): void {
    const total = Number(this.form.get('Valor_total')?.value || 0);
    const emissao = String(this.form.get('Data_emissao')?.value || this.today());
    if (!qtd || qtd < 1 || total <= 0) return;
    this.clearParcelas();
    const base = Math.floor((total / qtd) * 100) / 100;
    let acumulado = 0;
    for (let i = 1; i <= qtd; i++) {
      const valor = i === qtd ? Number((total - acumulado).toFixed(2)) : base;
      acumulado = Number((acumulado + valor).toFixed(2));
      this.parcelasFA.push(this.fb.group({
        parcela_n: [i, [Validators.required, Validators.min(1)]],
        Data_vencimento: [this.addDays(emissao, i === 1 ? 0 : 30 * (i - 1)), Validators.required],
        valor_parcela: [valor, [Validators.required, Validators.min(0.01)]]
      }));
    }
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.parcelasFA.length === 0) {
      this.errorMsg = 'Revise os campos obrigatórios antes de salvar.';
      return;
    }

    const raw = this.form.value as Record<string, any>;
    const payload: Partial<TituloFinanceiro> = {
      idloja: Number(raw['idloja']),
      Titulo: String(raw['Titulo']).trim(),
      Documento: this.blankToNull(raw['Documento']),
      Data_emissao: String(raw['Data_emissao']),
      Valor_total: Number(raw['Valor_total']),
      Previsao: !!raw['Previsao'],
      FormaPagamento: this.blankToNull(raw['FormaPagamento']),
      Idnatureza: Number(raw['Idnatureza']),
      conta_contabil: this.blankToNull(raw['conta_contabil'])
    };

    if (this.tipo === 'pagar') {
      payload.idfornecedor = Number(raw['parceiro']);
    } else {
      payload.idcliente = Number(raw['parceiro']);
    }

    this.saving = true;
    this.api.create(this.tipo, payload).subscribe({
      next: created => this.salvarParcelas(created),
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar o título.';
      }
    });
  }

  baixar(parcela: ParcelaFinanceira): void {
    const id = this.parcelaId(parcela);
    if (!id) return;
    const valorAtual = Number(parcela.valor_parcela || 0);
    const valor = Number(prompt('Valor da baixa', String(valorAtual)) || 0);
    if (valor <= 0) return;
    this.api.baixarParcela(this.tipo, id, { valor_baixa: valor, data_baixa: this.today() }).subscribe({
      next: () => {
        this.successMsg = 'Parcela baixada.';
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao baixar parcela.'
    });
  }

  cancelarParcela(parcela: ParcelaFinanceira): void {
    const id = this.parcelaId(parcela);
    if (!id) return;
    if (!confirm('Cancelar esta parcela?')) return;
    this.api.cancelarParcela(this.tipo, id, 'Cancelado pela tela financeira').subscribe({
      next: () => {
        this.successMsg = 'Parcela cancelada.';
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao cancelar parcela.'
    });
  }

  reabrirParcela(parcela: ParcelaFinanceira): void {
    const id = this.parcelaId(parcela);
    if (!id) return;
    this.api.reabrirParcela(this.tipo, id, 'Reaberto pela tela financeira').subscribe({
      next: () => {
        this.successMsg = 'Parcela reaberta.';
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao reabrir parcela.'
    });
  }

  excluir(titulo: TituloFinanceiro): void {
    const id = this.tituloId(titulo);
    if (!id) return;
    if (!confirm(`Excluir o título "${titulo.Titulo}"?`)) return;
    this.api.remove(this.tipo, id).subscribe({
      next: () => {
        this.successMsg = 'Título excluído.';
        this.load();
      },
      error: () => this.errorMsg = 'Falha ao excluir título.'
    });
  }

  tituloId(titulo: TituloFinanceiro): number | null {
    return this.tipo === 'pagar' ? (titulo.Idpagar ?? null) : (titulo.Idreceber ?? null);
  }

  parcelaId(parcela: ParcelaFinanceira): number | null {
    return this.tipo === 'pagar' ? (parcela.Idpagaritem ?? null) : (parcela.Idreceberitem ?? null);
  }

  parceiroNome(titulo: TituloFinanceiro): string {
    if (this.tipo === 'pagar') {
      const fornecedor = this.fornecedores.find(f => f.id === titulo.idfornecedor);
      return fornecedor?.nome_fornecedor || `Fornecedor #${titulo.idfornecedor ?? ''}`;
    }
    const cliente = this.clientes.find(c => c.id === titulo.idcliente);
    return cliente?.nome_cliente || `Cliente #${titulo.idcliente ?? ''}`;
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  parcelaTitulo(titulo: TituloFinanceiro, parcela: ParcelaFinanceira): string {
    const base = this.tituloBase(titulo);
    return `${base}-${parcela.parcela_n || 1}`;
  }

  tituloBase(titulo: TituloFinanceiro): string {
    const documento = (titulo.Documento || '').trim();
    if (documento) {
      const partes = documento.split('/').filter(Boolean);
      return partes[partes.length - 1] || documento;
    }

    const tituloTexto = (titulo.Titulo || '').trim();
    const match = tituloTexto.match(/^(.+)-\d+$/);
    return match?.[1] || tituloTexto || String(this.tituloId(titulo) || '');
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  private salvarParcelas(created: TituloFinanceiro): void {
    const tituloId = this.tituloId(created);
    if (!tituloId) {
      this.saving = false;
      this.errorMsg = 'Título salvo, mas não foi possível criar as parcelas.';
      return;
    }

    const raw = this.form.value as Record<string, any>;
    const parcelas = this.parcelasFA.controls.map(ctrl => {
      const value = ctrl.value as Record<string, any>;
      const payload: Partial<ParcelaFinanceira> = {
        parcela_n: Number(value['parcela_n']),
        Data_vencimento: String(value['Data_vencimento']),
        valor_parcela: Number(value['valor_parcela']),
        FormaPagamento: this.blankToNull(raw['FormaPagamento']),
        Previsao: !!raw['Previsao'],
        Idnatureza: Number(raw['Idnatureza']),
        status: raw['Previsao'] ? 'PREVISTO' : 'EFETIVO'
      };
      if (this.tipo === 'pagar') {
        payload.Idpagar = tituloId;
      } else {
        payload.Idreceber = tituloId;
      }
      return this.api.createParcela(this.tipo, payload);
    });

    forkJoin(parcelas).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Título salvo com parcelas.';
        this.cancelar();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Título salvo, mas houve falha ao criar parcelas.';
      }
    });
  }

  private clearParcelas(): void {
    while (this.parcelasFA.length) {
      this.parcelasFA.removeAt(0);
    }
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private blankToNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(dateText: string, days: number): string {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
