// src/app/features/formas-pagamento/formas-pagamento.component.ts
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FormaPagamento, FormaPagamentoParcela, PrazoPagamento, TipoFormaPagamento } from '../../core/models/forma-pagamento';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-formas-pagamento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './formas-pagamento.component.html',
  styleUrls: ['./formas-pagamento.component.css']
})
export class FormasPagamentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FormasPagamentoService);
  private contasApi = inject(ContasBancariasService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  search = '';
  filterLiquidacao = '';
  filterTipo = '';
  filterStatus = '';
  advancedOpen = false;
  columnsOpen = false;
  exportOpen = false;
  selectedForma: FormaPagamento | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.formas-pagamento.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.formas-pagamento';
  columns = [
    { key: 'codigo', label: 'Código', visible: true, required: true },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'tipo', label: 'Tipo', visible: true, required: false },
    { key: 'parcelas', label: 'Parcelas', visible: true, required: false },
    { key: 'liquidacao', label: 'Liquidação', visible: true, required: false },
    { key: 'taxa', label: 'Taxa', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;
  excluirModal: FormaPagamento | null = null;

  formasAll: FormaPagamento[] = [];
  formas: FormaPagamento[] = [];
  contas: ContaBancaria[] = [];
  prazos: PrazoPagamento[] = [];
  tipos = [
    { value: 'DINHEIRO' as TipoFormaPagamento, label: 'Dinheiro' },
    { value: 'PIX' as TipoFormaPagamento, label: 'Pix' },
    { value: 'DEBITO' as TipoFormaPagamento, label: 'Cartão débito' },
    { value: 'CREDITO_ROTATIVO' as TipoFormaPagamento, label: 'Crédito rotativo' },
    { value: 'CREDITO_PARCELADO' as TipoFormaPagamento, label: 'Crédito parcelado' },
    { value: 'BOLETO' as TipoFormaPagamento, label: 'Boleto' },
    { value: 'TRANSFERENCIA' as TipoFormaPagamento, label: 'Transferência' },
    { value: 'OUTRO' as TipoFormaPagamento, label: 'Outro' },
  ];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  originalParcelasIds: number[] = [];

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    tipo: ['DINHEIRO' as TipoFormaPagamento, Validators.required],
    ativo: [true],
    gera_recebivel_bancario: [false],
    adquirente: ['', Validators.maxLength(80)],
    conta_liquidacao: [null as number | null],
    prazo_pagamento: [null as number | null],
    prazo_credito_dias: [0, [Validators.min(0)]],
    taxa_percentual: [0, [Validators.min(0)]],
    taxa_fixa: [0, [Validators.min(0)]],
    tef_habilitado: [false],
    tef_modalidade: [''],
    tef_adquirente_codigo: ['', Validators.maxLength(40)],
    tef_terminal_logico: ['', Validators.maxLength(40)],
    parcelas: this.fb.array([])
  });

  get parcelasFA(): FormArray {
    return this.form.get('parcelas') as FormArray;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }
  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('financeiro', true) !== false;
  }
  get searchSuggestions(): string[] {
    const valores = this.formasAll.flatMap(item => [
      item.codigo,
      item.descricao,
      this.tipoLabel(item.tipo),
      item.ativo ? 'Ativo' : 'Inativo'
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
  }

  // ====== Helpers ======

  private filterList(all: FormaPagamento[]): FormaPagamento[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(f =>
      (f.codigo || '').toLowerCase().includes(q) ||
      (f.descricao || '').toLowerCase().includes(q)
    );
  }

  private applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const filtered = this.formasFiltradas;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    this.formas = filtered.slice(start, end);
    if (this.selectedForma && !filtered.some(f => this.formaId(f) === this.formaId(this.selectedForma))) this.selectedForma = null;
  }

  private makeParcelaGroup(p?: Partial<FormaPagamentoParcela>): FormGroup {
    return this.fb.group({
      Idformapagparcela: [p?.Idformapagparcela ?? null],
      ordem: [p?.ordem ?? (this.parcelasFA.length + 1), [Validators.required, Validators.min(1)]],
      dias: [p?.dias ?? 0, [Validators.required, Validators.min(0)]],
      percentual: [p?.percentual ?? null],
      valor_fixo: [p?.valor_fixo ?? null],
    });
  }

  private clearParcelas(): void {
    while (this.parcelasFA.length) {
      this.parcelasFA.removeAt(0);
    }
    this.originalParcelasIds = [];
  }

  private blankToNull(v: any): string | null {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }

  // ====== Fluxo lista ======

  load(): void {
    this.loading = true;
    forkJoin({ formas: this.api.list(), contas: this.contasApi.list({ ativo: true }), prazos: this.api.listPrazos({ ativo: true }) }).subscribe({
      next: (res: any) => {
        this.contas = Array.isArray(res.contas) ? res.contas : (res.contas?.results ?? []);
        this.prazos = Array.isArray(res.prazos) ? res.prazos : (res.prazos?.results ?? []);
        const rawArr: FormaPagamento[] = Array.isArray(res.formas) ? res.formas : (res.formas?.results ?? []);
        this.formasAll = rawArr;
        this.total = this.formasFiltradas.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.formasAll = [];
        this.formas = [];
        this.prazos = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar formas de pagamento.';
      }
    });
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 10;
    localStorage.setItem('sysvar.list.formas-pagamento.pageSize', String(this.pageSize));
    this.page = 1;
    this.applyPage();
  }

  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.applyPage();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }

  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.applyPage();
    }
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }

  doSearch(): void {
    this.page = 1;
    this.applyPage();
  }

  clearSearch(): void {
      this.search = '';
      this.filterLiquidacao = '';
      this.filterTipo = '';
      this.filterStatus = '';
    this.page = 1;
    this.applyPage();
  }

  // ====== Fluxo form ======

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      codigo: '',
      descricao: '',
      tipo: 'DINHEIRO',
      ativo: true,
      gera_recebivel_bancario: false,
      adquirente: '',
      conta_liquidacao: null,
      prazo_pagamento: null,
      prazo_credito_dias: 0,
      taxa_percentual: 0,
      taxa_fixa: 0,
      tef_habilitado: false,
      tef_modalidade: '',
      tef_adquirente_codigo: '',
      tef_terminal_logico: ''
    });
    this.clearParcelas();
    this.addParcela();
  }

  editar(row: FormaPagamento, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    const id = row.Idformapagamento ?? (row as any).id ?? null;
    if (!id) return;

    this.showForm = true;
    this.editingId = id;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.loading = true;

    this.api.get(id).subscribe({
      next: (det: FormaPagamento) => {
        this.form.enable({ emitEvent: false });
        this.form.reset({
          codigo: det.codigo ?? '',
          descricao: det.descricao ?? '',
          tipo: det.tipo ?? 'OUTRO',
          ativo: !!det.ativo,
          gera_recebivel_bancario: !!det.gera_recebivel_bancario,
          adquirente: det.adquirente ?? '',
          conta_liquidacao: det.conta_liquidacao ?? null,
          prazo_pagamento: det.prazo_pagamento ?? null,
          prazo_credito_dias: Number(det.prazo_credito_dias || 0),
          taxa_percentual: Number(det.taxa_percentual || 0),
          taxa_fixa: Number(det.taxa_fixa || 0),
          tef_habilitado: !!det.tef_habilitado,
          tef_modalidade: det.tef_modalidade ?? '',
          tef_adquirente_codigo: det.tef_adquirente_codigo ?? '',
          tef_terminal_logico: det.tef_terminal_logico ?? ''
        });

        this.clearParcelas();
        const parcelas = det.parcelas ?? [];
        this.originalParcelasIds = parcelas
          .map(p => p.Idformapagparcela)
          .filter((x): x is number => typeof x === 'number');

        parcelas
          .slice()
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .forEach(p => this.parcelasFA.push(this.makeParcelaGroup(p)));

        if (this.parcelasFA.length === 0) {
          this.addParcela();
        }

        if (this.consultando) {
          this.form.disable({ emitEvent: false });
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar detalhes da forma.';
      }
    });
  }

  consultar(row: FormaPagamento): void {
    const id = row.Idformapagamento ?? (row as any).id ?? null;
    if (!id) return;
    this.editar(row, true);
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.form.enable({ emitEvent: false });
    this.clearParcelas();
  }

  addParcela(): void {
    if (this.consultando) return;
    this.parcelasFA.push(this.makeParcelaGroup());
  }

  removeParcela(ix: number): void {
    if (this.consultando) return;
    if (ix < 0 || ix >= this.parcelasFA.length) return;
    this.parcelasFA.removeAt(ix);
    // renumera ordens
    this.parcelasFA.controls.forEach((fg, i) => {
      const ctrl = fg.get('ordem');
      if (ctrl) ctrl.setValue(i + 1);
    });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    this.submitted = true;

    if (this.parcelasFA.length === 0) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    const f = this.form.value as any;
    const numParcelas = this.parcelasFA.length;

    const payload: any = {
      codigo: (f.codigo || '').toString().trim(),
      descricao: (f.descricao || '').toString().trim(),
      tipo: f.tipo || 'OUTRO',
      ativo: !!f.ativo,
      gera_recebivel_bancario: !!f.gera_recebivel_bancario,
      adquirente: null,
      conta_liquidacao: f.gera_recebivel_bancario ? Number(f.conta_liquidacao) : null,
      prazo_pagamento: f.prazo_pagamento ? Number(f.prazo_pagamento) : null,
      prazo_credito_dias: Number(f.prazo_credito_dias || 0),
      taxa_percentual: this.blankToNull(f.taxa_percentual) ?? '0',
      taxa_fixa: this.blankToNull(f.taxa_fixa) ?? '0',
      tef_habilitado: false,
      tef_modalidade: '',
      tef_adquirente_codigo: '',
      tef_terminal_logico: '',
      num_parcelas: numParcelas
    };

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const isEdit = this.editingId != null;

    const afterFormaSaved = (formaId: number) => {
      // monta payloads das parcelas
      const parcelasPayload = this.parcelasFA.controls.map(fg => {
        const raw = fg.value as any;
        return {
          forma: formaId,
          ordem: Number(raw.ordem) || 1,
          dias: Number(raw.dias) || 0,
          percentual: this.blankToNull(raw.percentual),
          valor_fixo: this.blankToNull(raw.valor_fixo),
        };
      });

      const deleteIds = [...this.originalParcelasIds];

      const doCreates = () => {
        if (parcelasPayload.length === 0) {
          this.saving = false;
          this.successMsg = isEdit ? 'Alterações salvas com sucesso.' : 'Forma criada com sucesso.';
          this.cancelarEdicao();
          this.page = 1;
          this.load();
          return;
        }

        const creates$ = parcelasPayload.map(p =>
          this.api.createParcela(p)
        );

        forkJoin(creates$).subscribe({
          next: () => {
            this.saving = false;
            this.successMsg = isEdit ? 'Alterações salvas com sucesso.' : 'Forma criada com sucesso.';
            this.cancelarEdicao();
            this.page = 1;
            this.load();
          },
          error: () => {
            this.saving = false;
            this.errorMsg = 'Falha ao salvar parcelas.';
          }
        });
      };

      if (deleteIds.length > 0) {
        const deletes$ = deleteIds.map(id => this.api.deleteParcela(id));
        forkJoin(deletes$).subscribe({
          next: () => { doCreates(); },
          error: () => {
            this.saving = false;
            this.errorMsg = 'Falha ao atualizar parcelas.';
          }
        });
      } else {
        doCreates();
      }
    };

    if (!isEdit) {
      this.api.create(payload).subscribe({
        next: (created: FormaPagamento) => {
          const formaId = created.Idformapagamento ?? (created as any).id;
          if (!formaId) {
            this.saving = false;
            this.errorMsg = 'Forma criada, mas não foi possível obter o ID.';
            return;
          }
          this.originalParcelasIds = []; // não havia antes
          afterFormaSaved(formaId);
        },
        error: (err) => {
          this.saving = false;
          this.handleServerErrors(err);
        }
      });
    } else {
      const id = this.editingId!;
      this.api.update(id, payload).subscribe({
        next: () => {
          afterFormaSaved(id);
        },
        error: (err) => {
          this.saving = false;
          this.handleServerErrors(err);
        }
      });
    }
  }

  excluir(item: FormaPagamento): void {
    if (!this.podeEditarModulo) return;
    const id = item.Idformapagamento ?? (item as any).id;
    if (!id) return;
    this.excluirModal = item;
  }

  confirmarExclusao(): void {
    if (!this.podeEditarModulo) return;
    const item = this.excluirModal;
    const id = item ? (item.Idformapagamento ?? (item as any).id) : null;
    if (!id) return;
    this.saving = true;
    this.api.remove(id).subscribe({
      next: () => {
        this.saving = false;
        this.excluirModal = null;
        this.successMsg = 'Forma excluída.';
        const eraUltimo = this.formas.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao excluir forma.';
      }
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  get formasFiltradas(): FormaPagamento[] {
    const term = this.search.trim().toLowerCase();
    return this.formasAll.filter(f => {
      const tipo = this.tipoLabel(f.tipo).toLowerCase();
      const matchesSearch = !term || (f.codigo || '').toLowerCase().includes(term) || (f.descricao || '').toLowerCase().includes(term) || tipo.includes(term);
      const matchesLiquidacao = !this.filterLiquidacao || (this.filterLiquidacao === 'banco' && !!f.gera_recebivel_bancario) || (this.filterLiquidacao === 'caixa' && !f.gera_recebivel_bancario);
      const matchesTipo = !this.filterTipo || f.tipo === this.filterTipo;
      const matchesStatus = !this.filterStatus || (this.filterStatus === 'ativo' && f.ativo !== false) || (this.filterStatus === 'inativo' && f.ativo === false);
      return matchesSearch && matchesLiquidacao && matchesTipo && matchesStatus;
    });
  }
  get indicadores() {
    const total = this.formasAll.length;
    return { total, ativas: this.formasAll.filter(f => f.ativo !== false).length, banco: this.formasAll.filter(f => f.gera_recebivel_bancario).length, comTaxa: this.formasAll.filter(f => Number(f.taxa_percentual || 0) > 0 || Number(f.taxa_fixa || 0) > 0).length, filtradas: this.total };
  }
  tipoLabel(tipo?: string | null): string { return this.tipos.find(t => t.value === tipo)?.label ?? 'Outro'; }
  prazoLabel(id?: number | null): string {
    if (!id) return 'Sem prazo';
    const prazo = this.prazos.find(p => (p.Idprazo ?? (p as any).id) === id);
    return prazo ? prazo.descricao : 'Prazo';
  }
  taxaLabel(f: FormaPagamento): string {
    const percentual = Number(f.taxa_percentual || 0);
    const fixa = Number(f.taxa_fixa || 0);
    if (!percentual && !fixa) return '0';
    const partes = [];
    if (percentual) partes.push(`${percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`);
    if (fixa) partes.push(`R$ ${fixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    return partes.join(' + ');
  }
  formaId(f: FormaPagamento | null): number | null { return f ? (f.Idformapagamento ?? (f as any).id ?? null) : null; }
  selecionarForma(f: FormaPagamento): void { this.selectedForma = this.formaId(this.selectedForma) === this.formaId(f) ? null : f; }
  isSelected(f: FormaPagamento): boolean { return this.formaId(this.selectedForma) === this.formaId(f); }
  consultarSelecionada(): void { if (this.selectedForma) this.consultar(this.selectedForma); }
  editarSelecionada(): void { if (this.selectedForma && this.podeEditarModulo) this.editar(this.selectedForma); }
  excluirSelecionada(): void { if (this.selectedForma && this.podeEditarModulo) this.excluir(this.selectedForma); }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void { const col = this.columns.find(c => c.key === key); if (!col || col.required) return; col.visible = checked; this.saveColumnsPreference(); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); localStorage.removeItem('sysvar.list.formas-pagamento.pageSize'); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.columns = this.columns.map(c => ({ ...c, visible: true })); this.saveColumnsPreference(); this.applyPage(); }
  @HostListener('window:sysvar-formas-pagamento-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-formas-pagamento-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-formas-pagamento-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  // ====== Erros / overlay ======

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const push = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };

    push(f.get('codigo')?.hasError('required') || false, 'codigo: Este campo é obrigatório.');
    push(f.get('codigo')?.hasError('maxlength') || false, 'codigo: Máx. 10 caracteres.');
    push(f.get('descricao')?.hasError('required') || false, 'descricao: Este campo é obrigatório.');
    push(f.get('descricao')?.hasError('maxlength') || false, 'descricao: Máx. 120 caracteres.');
    push(f.get('tipo')?.hasError('required') || false, 'tipo: Informe o tipo da forma.');
    push(!!f.get('gera_recebivel_bancario')?.value && !f.get('conta_liquidacao')?.value, 'conta_liquidacao: Informe a conta de liquidação.');

    const fields = ['codigo', 'descricao', 'tipo', 'conta_liquidacao', 'prazo_pagamento'];
    const seen = new Set<string>();
    fields.forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err && !seen.has(field)) {
        msgs.push(`${field}: ${err}`);
        seen.add(field);
      }
    });

    this.parcelasFA.controls.forEach((fg, i) => {
      const p = i + 1;
      if (fg.get('ordem')?.hasError('required') || fg.get('ordem')?.hasError('min')) {
        msgs.push(`Parcela ${p}: ordem inválida.`);
      }
      if (fg.get('dias')?.hasError('required') || fg.get('dias')?.hasError('min')) {
        msgs.push(`Parcela ${p}: dias inválido.`);
      }
    });

    if (this.parcelasFA.length === 0) {
      msgs.push('É necessário informar ao menos uma parcela.');
    }

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }

  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }

  private handleServerErrors(err: any): void {
    this.successMsg = '';

    const serverErrors = err?.error && typeof err.error === 'object' ? err.error : null;
    if (serverErrors) {
      const mapToCtrl = (apiField: string) => apiField; // direto
      const seen = new Set<string>();
      Object.keys(serverErrors).forEach(apiField => {
        const ctrlName = mapToCtrl(apiField);
        const ctrl = this.form.get(ctrlName);
        if (!ctrl || seen.has(ctrlName)) return;
        ctrl.setErrors({
          ...(ctrl.errors || {}),
          server: Array.isArray(serverErrors[apiField])
            ? serverErrors[apiField].join(' ')
            : String(serverErrors[apiField])
        });
        seen.add(ctrlName);
      });
    }
    this.openErrorOverlayIfNeeded();
  }

  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.formas-pagamento.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {}
  }

  private saveColumnsPreference(): void {
    localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible]))));
  }

  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {}
  }

  private saveViewPreference(): void {
    localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible }));
  }
}
