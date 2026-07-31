import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { PrazoPagamento, PrazoPagamentoParcela } from '../../core/models/forma-pagamento';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-prazos-pagamento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './prazos-pagamento.component.html',
  styleUrls: ['./prazos-pagamento.component.css'],
})
export class PrazosPagamentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FormasPagamentoService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  consultando = false;
  editingId: number | null = null;
  search = '';
  filterStatus = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;
  columnsOpen = false;
  selectedPrazo: PrazoPagamento | null = null;
  excluirModal: PrazoPagamento | null = null;
  indicatorsVisible = true;
  filtersVisible = true;
  private readonly columnsStorageKey = 'sysvar.list.prazos-pagamento.columns';
  private readonly viewPrefsKey = 'sysvar.ui.preferences.prazos-pagamento';
  columns = [
    { key: 'codigo', label: 'Código', visible: true, required: true },
    { key: 'descricao', label: 'Descrição', visible: true, required: true },
    { key: 'parcelas', label: 'Parcelas', visible: true, required: false },
    { key: 'intervalo', label: 'Intervalo', visible: true, required: false },
    { key: 'dias', label: 'Dias', visible: true, required: false },
    { key: 'status', label: 'Status', visible: true, required: false },
  ];

  prazosAll: PrazoPagamento[] = [];
  prazos: PrazoPagamento[] = [];
  originalParcelasIds: number[] = [];
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(12)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    num_parcelas: [1, [Validators.required, Validators.min(1)]],
    intervalo_dias: [30, [Validators.required, Validators.min(0)]],
    ativo: [true],
    parcelas: this.fb.array([]),
  });

  get parcelasFA(): FormArray { return this.form.get('parcelas') as FormArray; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('configuracoes', true) !== false; }
  get indicadores() {
    const total = this.prazosAll.length;
    return {
      total,
      ativas: this.prazosAll.filter(p => p.ativo !== false).length,
      parcelados: this.prazosAll.filter(p => Number(p.num_parcelas || 0) > 1).length,
      filtrados: this.total,
    };
  }
  get searchSuggestions(): string[] {
    return Array.from(new Set(this.prazosAll.flatMap(p => [p.codigo, p.descricao]).filter((v): v is string => !!v)));
  }

  ngOnInit(): void {
    this.loadColumnsPreference();
    this.loadViewPreference();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listPrazos().subscribe({
      next: (res: any) => {
        this.prazosAll = Array.isArray(res) ? res : (res?.results ?? []);
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.prazosAll = [];
        this.prazos = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar prazos.';
      }
    });
  }

  applyPage(): void {
    const filtered = this.prazosFiltrados;
    this.total = filtered.length;
    if (this.page > this.totalPages) this.page = this.totalPages;
    const start = (this.page - 1) * this.pageSize;
    this.prazos = filtered.slice(start, start + this.pageSize);
    if (this.selectedPrazo && !filtered.some(p => this.prazoId(p) === this.prazoId(this.selectedPrazo))) this.selectedPrazo = null;
  }

  doSearch(): void { this.page = 1; this.applyPage(); }
  clearSearch(): void { this.search = ''; this.filterStatus = ''; this.page = 1; this.applyPage(); }
  onPageSizeChange(sizeStr: string | number): void { this.pageSize = Number(sizeStr) || 20; localStorage.setItem('sysvar.list.prazos-pagamento.pageSize', String(this.pageSize)); this.page = 1; this.applyPage(); }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo: '', descricao: '', num_parcelas: 1, intervalo_dias: 30, ativo: true });
    this.clearParcelas();
    this.addParcela();
  }

  editar(row: PrazoPagamento, modoConsulta = false): void {
    if (!modoConsulta && !this.podeEditarModulo) return;
    const id = this.prazoId(row);
    if (!id) return;
    this.showForm = true;
    this.editingId = id;
    this.consultando = modoConsulta;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.loading = true;
    this.api.getPrazo(id).subscribe({
      next: det => {
        this.form.enable({ emitEvent: false });
        this.form.reset({
          codigo: det.codigo ?? '',
          descricao: det.descricao ?? '',
          num_parcelas: Number(det.num_parcelas || 1),
          intervalo_dias: Number(det.intervalo_dias || 0),
          ativo: det.ativo !== false,
        });
        this.clearParcelas();
        const parcelas = det.parcelas ?? [];
        this.originalParcelasIds = parcelas.map(p => p.Idprazoparcela).filter((x): x is number => typeof x === 'number');
        parcelas.slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).forEach(p => this.parcelasFA.push(this.makeParcelaGroup(p)));
        if (this.parcelasFA.length === 0) this.addParcela();
        if (this.consultando) this.form.disable({ emitEvent: false });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar detalhes do prazo.';
      }
    });
  }

  consultar(row: PrazoPagamento): void { this.editar(row, true); }
  cancelarEdicao(): void { this.showForm = false; this.editingId = null; this.consultando = false; this.submitted = false; this.errorOverlayOpen = false; this.form.enable({ emitEvent: false }); this.clearParcelas(); }

  gerarParcelas(): void {
    if (this.consultando) return;
    const qtd = Math.max(1, Number(this.form.get('num_parcelas')?.value || 1));
    const intervalo = Math.max(0, Number(this.form.get('intervalo_dias')?.value || 0));
    this.clearParcelas();
    for (let i = 1; i <= qtd; i++) {
      this.parcelasFA.push(this.makeParcelaGroup({ ordem: i, dias: intervalo === 0 ? 0 : intervalo * i, percentual: this.percentualParcela(qtd, i) }));
    }
  }

  addParcela(): void {
    if (this.consultando) return;
    this.parcelasFA.push(this.makeParcelaGroup({ ordem: this.parcelasFA.length + 1, dias: 0 }));
    this.form.get('num_parcelas')?.setValue(this.parcelasFA.length, { emitEvent: false });
  }

  removeParcela(ix: number): void {
    if (this.consultando || ix < 0 || ix >= this.parcelasFA.length) return;
    this.parcelasFA.removeAt(ix);
    this.parcelasFA.controls.forEach((fg, i) => fg.get('ordem')?.setValue(i + 1));
    this.form.get('num_parcelas')?.setValue(this.parcelasFA.length, { emitEvent: false });
  }

  salvar(): void {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.parcelasFA.length === 0 || this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }
    const raw = this.form.value as any;
    const payload: Partial<PrazoPagamento> = {
      codigo: String(raw.codigo || '').trim(),
      descricao: String(raw.descricao || '').trim(),
      num_parcelas: this.parcelasFA.length,
      intervalo_dias: Number(raw.intervalo_dias || 0),
      ativo: !!raw.ativo,
    };
    this.saving = true;
    this.errorMsg = '';
    const isEdit = this.editingId != null;
    const req$ = isEdit ? this.api.updatePrazo(this.editingId!, payload) : this.api.createPrazo(payload);
    req$.subscribe({
      next: prazo => {
        const id = this.prazoId(prazo) ?? this.editingId;
        if (!id) { this.saving = false; this.errorMsg = 'Prazo salvo, mas não foi possível obter o ID.'; return; }
        this.salvarParcelas(id, isEdit);
      },
      error: err => { this.saving = false; this.handleServerErrors(err); }
    });
  }

  private salvarParcelas(prazoId: number, isEdit: boolean): void {
    const payloads = this.parcelasFA.controls.map(fg => {
      const raw = fg.value as any;
      return { prazo: prazoId, ordem: Number(raw.ordem) || 1, dias: Number(raw.dias) || 0, percentual: this.blankToNull(raw.percentual) };
    });
    const finalizar = () => {
      forkJoin(payloads.map(p => this.api.createPrazoParcela(p))).subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = isEdit ? 'Alterações salvas com sucesso.' : 'Prazo criado com sucesso.';
          this.cancelarEdicao();
          this.load();
        },
        error: () => { this.saving = false; this.errorMsg = 'Falha ao salvar parcelas do prazo.'; }
      });
    };
    if (!this.originalParcelasIds.length) { finalizar(); return; }
    forkJoin(this.originalParcelasIds.map(id => this.api.deletePrazoParcela(id))).subscribe({
      next: finalizar,
      error: () => { this.saving = false; this.errorMsg = 'Falha ao atualizar parcelas do prazo.'; }
    });
  }

  excluir(item: PrazoPagamento): void { if (this.podeEditarModulo) this.excluirModal = item; }
  confirmarExclusao(): void {
    const id = this.prazoId(this.excluirModal);
    if (!id) return;
    this.saving = true;
    this.api.deletePrazo(id).subscribe({
      next: () => { this.saving = false; this.excluirModal = null; this.successMsg = 'Prazo excluído.'; this.load(); },
      error: () => { this.saving = false; this.errorMsg = 'Não foi possível excluir. Verifique se o prazo está vinculado a uma forma de pagamento.'; }
    });
  }
  fecharExclusao(): void { this.excluirModal = null; }

  get prazosFiltrados(): PrazoPagamento[] {
    const term = this.search.trim().toLowerCase();
    return this.prazosAll.filter(p => {
      const matchesSearch = !term || String(p.codigo || '').toLowerCase().includes(term) || String(p.descricao || '').toLowerCase().includes(term);
      const matchesStatus = !this.filterStatus || (this.filterStatus === 'ativo' && p.ativo !== false) || (this.filterStatus === 'inativo' && p.ativo === false);
      return matchesSearch && matchesStatus;
    });
  }
  diasResumo(p: PrazoPagamento): string {
    const dias = (p.parcelas ?? []).slice().sort((a, b) => a.ordem - b.ordem).map(parcela => parcela.dias);
    return dias.length ? dias.join('/') : '-';
  }
  prazoId(p: PrazoPagamento | null): number | null { return p ? (p.Idprazo ?? (p as any).id ?? null) : null; }
  selecionarPrazo(p: PrazoPagamento): void { this.selectedPrazo = this.prazoId(this.selectedPrazo) === this.prazoId(p) ? null : p; }
  isSelected(p: PrazoPagamento): boolean { return this.prazoId(this.selectedPrazo) === this.prazoId(p); }
  consultarSelecionado(): void { if (this.selectedPrazo) this.consultar(this.selectedPrazo); }
  editarSelecionado(): void { if (this.selectedPrazo && this.podeEditarModulo) this.editar(this.selectedPrazo); }
  excluirSelecionado(): void { if (this.selectedPrazo && this.podeEditarModulo) this.excluir(this.selectedPrazo); }
  visibleColumn(key: string): boolean { return this.columns.find(c => c.key === key)?.visible !== false; }
  toggleColumn(key: string, checked: boolean): void { const col = this.columns.find(c => c.key === key); if (!col || col.required) return; col.visible = checked; this.saveColumnsPreference(); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); localStorage.removeItem('sysvar.list.prazos-pagamento.pageSize'); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.columns = this.columns.map(c => ({ ...c, visible: true })); this.saveColumnsPreference(); this.applyPage(); }

  @HostListener('window:sysvar-prazos-pagamento-toggle-indicators') onToggleIndicatorsEvent(): void { this.toggleIndicators(); }
  @HostListener('window:sysvar-prazos-pagamento-toggle-filters') onToggleFiltersEvent(): void { this.toggleFilters(); }
  @HostListener('window:sysvar-prazos-pagamento-restore-view') onRestoreViewEvent(): void { this.restoreViewPreference(); }

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const push = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };
    push(f.get('codigo')?.hasError('required') || false, 'codigo: Este campo é obrigatório.');
    push(f.get('codigo')?.hasError('maxlength') || false, 'codigo: Máx. 12 caracteres.');
    push(f.get('descricao')?.hasError('required') || false, 'descricao: Este campo é obrigatório.');
    push(f.get('descricao')?.hasError('maxlength') || false, 'descricao: Máx. 120 caracteres.');
    push(f.get('num_parcelas')?.hasError('min') || false, 'num_parcelas: Informe ao menos 1 parcela.');
    push(f.get('intervalo_dias')?.hasError('min') || false, 'intervalo_dias: O intervalo não pode ser negativo.');
    if (this.parcelasFA.length === 0) msgs.push('É necessário informar ao menos uma parcela.');
    this.parcelasFA.controls.forEach((fg, i) => {
      if (fg.get('ordem')?.invalid) msgs.push(`Parcela ${i + 1}: ordem inválida.`);
      if (fg.get('dias')?.invalid) msgs.push(`Parcela ${i + 1}: dias inválido.`);
    });
    return msgs;
  }

  openErrorOverlayIfNeeded(): void { this.errorOverlayOpen = this.getFormErrors().length > 0; }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }

  private makeParcelaGroup(p?: Partial<PrazoPagamentoParcela>): FormGroup {
    return this.fb.group({
      Idprazoparcela: [p?.Idprazoparcela ?? null],
      ordem: [p?.ordem ?? (this.parcelasFA.length + 1), [Validators.required, Validators.min(1)]],
      dias: [p?.dias ?? 0, [Validators.required, Validators.min(0)]],
      percentual: [p?.percentual ?? null],
    });
  }
  private clearParcelas(): void {
    while (this.parcelasFA.length) this.parcelasFA.removeAt(0);
    this.originalParcelasIds = [];
  }
  private percentualParcela(qtd: number, ordem: number): string {
    const base = 100 / qtd;
    if (ordem === qtd) return (100 - Number((base * (qtd - 1)).toFixed(6))).toFixed(6);
    return base.toFixed(6);
  }
  private blankToNull(v: any): string | null {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }
  private handleServerErrors(err: any): void {
    const serverErrors = err?.error && typeof err.error === 'object' ? err.error : null;
    if (serverErrors) {
      Object.keys(serverErrors).forEach(field => {
        const ctrl = this.form.get(field);
        if (ctrl) ctrl.setErrors({ ...(ctrl.errors || {}), server: Array.isArray(serverErrors[field]) ? serverErrors[field].join(' ') : String(serverErrors[field]) });
      });
    }
    this.openErrorOverlayIfNeeded();
    if (!this.errorOverlayOpen) this.errorMsg = 'Falha ao salvar prazo.';
  }
  private loadColumnsPreference(): void {
    const size = Number(localStorage.getItem('sysvar.list.prazos-pagamento.pageSize'));
    if ([10, 20, 50, 100].includes(size)) this.pageSize = size;
    const raw = localStorage.getItem(this.columnsStorageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      this.columns = this.columns.map(c => c.required ? c : { ...c, visible: saved[c.key] ?? c.visible });
    } catch {}
  }
  private saveColumnsPreference(): void { localStorage.setItem(this.columnsStorageKey, JSON.stringify(Object.fromEntries(this.columns.map(c => [c.key, c.visible])))); }
  private loadViewPreference(): void {
    const raw = localStorage.getItem(this.viewPrefsKey);
    if (!raw) return;
    try {
      const pref = JSON.parse(raw) as { indicatorsVisible?: boolean; filtersVisible?: boolean };
      this.indicatorsVisible = pref.indicatorsVisible !== false;
      this.filtersVisible = pref.filtersVisible !== false;
    } catch {}
  }
  private saveViewPreference(): void { localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible })); }
}
