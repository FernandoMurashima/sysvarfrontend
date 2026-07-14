import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cfop } from '../../core/models/cfop';
import { Ncm } from '../../core/models/ncm';
import { RegraTributaria } from '../../core/models/regra-tributaria';
import { Tributo } from '../../core/models/tributo';
import { CfopsService } from '../../core/services/cfops.service';
import { NcmsService } from '../../core/services/ncms.service';
import { RegrasTributariasService } from '../../core/services/regras-tributarias.service';
import { TributosService } from '../../core/services/tributos.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-regras-tributarias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './regras-tributarias.component.html',
  styleUrls: ['./regras-tributarias.component.css'],
})
export class RegrasTributariasComponent {
  private fb = inject(FormBuilder);
  private api = inject(RegrasTributariasService);
  private tributosApi = inject(TributosService);
  private cfopsApi = inject(CfopsService);
  private ncmsApi = inject(NcmsService);
  private auth = inject(AuthService);

  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  submitted = false;
  saving = false;
  excluirModal: RegraTributaria | null = null;
  items = signal<RegraTributaria[]>([]);
  tributos = signal<Tributo[]>([]);
  cfops = signal<Cfop[]>([]);
  ncms = signal<Ncm[]>([]);
  page = signal(1);
  pageSize = signal(20);
  pageSizeOptions = [10, 20, 50];
  total = computed(() => this.items().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  paged = computed(() => this.items().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('fiscal', true) !== false;
  }

  showForm = false;
  editingId: number | null = null;
  consultando = false;
  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    tributo: [null, Validators.required],
    cfop: [null],
    ncm: [null],
    tipo_operacao: ['VENDA', Validators.required],
    regime_tributario: ['TODOS', Validators.required],
    tipo_produto: ['TODOS', Validators.required],
    uf_origem: ['', Validators.maxLength(2)],
    uf_destino: ['', Validators.maxLength(2)],
    cst_csosn: ['', Validators.maxLength(4)],
    base_calculo: ['VALOR_ITEM', Validators.required],
    aliquota: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    reducao_base: [0, [Validators.min(0), Validators.max(100)]],
    permite_credito: [false],
    compoe_custo: [false],
    entra_dre: [true],
    ativo: [true],
    vigencia_inicio: [new Date().toISOString().slice(0, 10), Validators.required],
    vigencia_fim: [null],
    observacoes: ['', Validators.maxLength(255)],
  });

  constructor() {
    effect(() => { if (this.page() > this.totalPages()) this.page.set(this.totalPages()); });
    this.loadLookups();
    this.load();
  }

  loadLookups() {
    this.tributosApi.list('').subscribe(rows => this.tributos.set(rows.filter(r => r.ativo)));
    this.cfopsApi.list('').subscribe(rows => this.cfops.set(rows.filter(r => r.ativo)));
    this.ncmsApi.list('').subscribe(rows => this.ncms.set(rows.filter(r => r.ativo !== false)));
  }
  load() {
    this.loading.set(true);
    this.api.list(this.search).subscribe({
      next: rows => { this.items.set(rows); this.page.set(1); },
      error: () => this.items.set([]),
      complete: () => this.loading.set(false),
    });
  }
  doSearch() { this.load(); }
  clearSearch() { this.search = ''; this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  novo() {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '', tributo: null, cfop: null, ncm: null, tipo_operacao: 'VENDA', regime_tributario: 'TODOS',
      tipo_produto: 'TODOS', uf_origem: '', uf_destino: '', cst_csosn: '', base_calculo: 'VALOR_ITEM',
      aliquota: 0, reducao_base: 0, permite_credito: false, compoe_custo: false, entra_dre: true,
      ativo: true, vigencia_inicio: new Date().toISOString().slice(0, 10), vigencia_fim: null, observacoes: ''
    });
  }
  editar(row: RegraTributaria) {
    if (!this.podeEditarModulo) return;
    this.showForm = true; this.editingId = row.id ?? null; this.consultando = false; this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({ ...row, cfop: row.cfop ?? null, ncm: row.ncm ?? null, uf_origem: row.uf_origem || '', uf_destino: row.uf_destino || '', cst_csosn: row.cst_csosn || '', observacoes: row.observacoes || '' });
  }
  consultar(row: RegraTributaria) { this.editar(row); this.consultando = true; this.form.disable({ emitEvent: false }); }
  cancelarEdicao() { this.showForm = false; this.editingId = null; this.consultando = false; this.form.enable({ emitEvent: false }); this.form.reset(); }
  salvar() {
    if (!this.podeEditarModulo) return;
    this.submitted = true;
    if (this.form.invalid) return;
    const body = this.form.getRawValue();
    body.uf_origem = (body.uf_origem || '').toUpperCase() || null;
    body.uf_destino = (body.uf_destino || '').toUpperCase() || null;
    body.cst_csosn = body.cst_csosn || null;
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => { this.successMsg.set(this.editingId ? 'Alterações salvas.' : 'Regra criada.'); this.cancelarEdicao(); this.load(); },
      complete: () => this.saving = false,
      error: () => this.saving = false,
    });
  }
  excluir(row: RegraTributaria) { if (this.podeEditarModulo) this.excluirModal = row; }
  confirmarExclusao() {
    if (!this.podeEditarModulo) return;
    if (!this.excluirModal?.id) return;
    this.api.delete(this.excluirModal.id).subscribe(() => { this.excluirModal = null; this.successMsg.set('Regra excluída.'); this.load(); });
  }
  fecharExclusao() { this.excluirModal = null; }
}
