import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Observable, Subscription } from 'rxjs';

import { Produto } from '../../core/models/produto';
import { ProdutosService } from '../../core/services/produtos.service';

import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { MateriaisService } from '../../core/services/material.service';
import { NcmsService } from '../../core/services/ncms.service';

type ItemRef = { id: number; label: string };

@Component({
  selector: 'app-produtos-uso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './produtos-uso.component.html',
  styleUrls: ['./produtos-uso.component.css'],
})
export class ProdutosUsoComponent {
  private fb = inject(FormBuilder);
  private api = inject(ProdutosService);

  private gruposApi = inject(GruposService);
  private subgruposApi = inject(SubgruposService);
  private unidadesApi = inject(UnidadesService);
  private materiaisApi = inject(MateriaisService);
  private ncmsApi = inject(NcmsService);

  // navegação
  view = signal<'list' | 'form'>('list');
  setViewList() { this.view.set('list'); this.cancelarEdicao(); this.load(); }
  setViewForm() { this.view.set('form'); }

  // flags
  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;

  // lista / pager
  produtos = signal<Produto[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  total = computed(() => this.produtos().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.produtos().slice(start, start + this.pageSize());
  });

  // form
  showForm = false;
  editingId: number | null = null;

  form: FormGroup = this.fb.group({
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    descricao_reduzida: [null, [Validators.maxLength(60)]],

    unidade: [null, [Validators.required]],
    grupo: [null],
    subgrupo: [null],
    material: [null],

    // NCM opcional (se preencher, tem que ser ####.##.##)
    ncm: [null, [Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],

    observacoes: [null],
  });

  // streams/options
  ncms$: Observable<any[]> = this.ncmsApi.list('');

  grupos: ItemRef[] = [];
  subgrupos: ItemRef[] = [];
  unidades: ItemRef[] = [];
  materiais: ItemRef[] = [];

  private unidadeMap = new Map<number, string>();
  private subGrupoSub?: Subscription;

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
    });

    this.loadLookups();
    this.wireGrupoToSubgrupo();
    this.load();
  }

  // util
  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  // lookups
  private loadLookups() {
    // Grupos (opcional para uso/consumo)
    this.gruposApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.grupos = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(g => ({ id: g.Idgrupo as number, label: `${g.Descricao}` }));
      },
      error: () => { this.grupos = []; }
    });

    // Unidades (obrigatório)
    this.unidadesApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.unidades = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(u => ({ id: u.Idunidade as number, label: u.Descricao as string }));
        this.unidadeMap.clear();
        this.unidades.forEach(u => this.unidadeMap.set(u.id, u.label));
      },
      error: () => { this.unidades = []; }
    });

    // Materiais (opcional)
    this.materiaisApi.list('').subscribe({
      next: (rows: any[]) => {
        const arr = Array.isArray(rows) ? rows : [];
        this.materiais = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(m => ({ id: m.Idmaterial as number, label: m.Descricao as string }));
      },
      error: () => { this.materiais = []; }
    });

    // Subgrupos inicial
    this.loadSubgrupos(null);
  }

  private wireGrupoToSubgrupo() {
    this.subGrupoSub?.unsubscribe();
    this.subGrupoSub = this.form.get('grupo')?.valueChanges.subscribe((idGrupo: number | null) => {
      this.form.patchValue({ subgrupo: null }, { emitEvent: false });
      this.loadSubgrupos(idGrupo ?? null);
    });
  }

  private loadSubgrupos(idGrupo: number | null) {
    if (idGrupo == null) {
      this.subgrupos = [];
      return;
    }

    this.subgruposApi.list({ Idgrupo: idGrupo, ordering: 'Descricao' }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.subgrupos = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map((sg: any) => ({
            id: sg.Idsubgrupo as number,
            label: sg.Descricao as string,
          }));
      },
      error: () => { this.subgrupos = []; }
    });
  }

  // lista / pager
  load() {
    this.loading.set(true);
    this.api.list({ search: this.search, ordering: '-data_cadastro', ativo: 'all', page_size: 100 }).subscribe({
      next: (data: any) => {
        const rows = this.arrayOrResults<Produto>(data)
          .filter(p => p.tipo_produto === '2'); // só uso/consumo
        this.produtos.set(rows);
        this.page.set(1);
      },
      error: () => {
        this.produtos.set([]);
        this.openErrorOverlay();
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  doSearch() { this.load(); }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  clearSearch() { this.search = ''; this.load(); }
  onPageSizeChange(v: number) { this.pageSize.set(+v); this.page.set(1); }
  firstPage() { this.page.set(1); }
  prevPage() { this.page.update(p => Math.max(1, p - 1)); }
  nextPage() { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage() { this.page.set(this.totalPages()); }

  unidadeLabel(id?: number | null) {
    if (!id) return '';
    return this.unidadeMap.get(id) ?? String(id);
  }

  // form
  novo() {
    this.setViewForm();
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({
      descricao: '',
      descricao_reduzida: null,
      unidade: null,
      grupo: null,
      subgrupo: null,
      material: null,
      ncm: null,
      observacoes: null,
    });
    this.loadSubgrupos(null);
  }

  editar(row: Produto) {
    this.setViewForm();
    this.showForm = true;
    this.editingId = row.Idproduto ?? null;
    this.submitted = false;

    this.form.reset({
      descricao: row.descricao ?? '',
      descricao_reduzida: row.descricao_reduzida ?? null,
      unidade: row.unidade ?? null,
      grupo: row.grupo ?? null,
      subgrupo: row.subgrupo ?? null,
      material: row.material ?? null,
      ncm: row.ncm ?? null,
      observacoes: row.observacoes ?? null,
    });

    this.loadSubgrupos(row.grupo ?? null);
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }

    const body: Partial<Produto> = {
      ...this.form.value,
      tipo_produto: '2',  // fixo uso/consumo
      grade: null,
      colecao: null,
      referencia: undefined, // não deve ser enviada
    };

    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: (produtoSalvo: Produto) => {
        this.finishSave();
      },
      error: (err) => {
        const controls = this.form.controls as any;
        if (err?.error) {
          Object.entries(err.error).forEach(([k, v]: any) => {
            if (controls[k]) controls[k].setErrors({ server: Array.isArray(v) ? v[0] : v });
          });
        }
        this.openErrorOverlay();
        this.saving = false;
      }
    });
  }

  private finishSave() {
    const isEdit = !!this.editingId;
    this.saving = false;
    this.cancelarEdicao();
    this.setViewList();
    this.successMsg.set(isEdit ? 'Alterações salvas.' : 'Produto de uso/consumo criado.');
  }

  excluir(row: Produto) {
    if (!row.Idproduto) return;
    if (!confirm(`Excluir o produto "${row.descricao}"?`)) return;
    this.api.remove(row.Idproduto).subscribe(() => this.load());
  }

  // flags (reaproveita endpoints do backend)
  async toggleAtivo(row: Produto) {
    if (!row.Idproduto) return;
    if (row.ativo) {
      const motivo = prompt('Motivo da inativação (mín. 3 caracteres):', '');
      if (motivo === null || motivo.trim().length < 3) return;
      const senha = prompt('Senha:', '');
      if (!senha) return;
      this.api.inativarProduto(row.Idproduto, motivo.trim(), senha).subscribe({
        next: (resp) => this.replaceRow(resp as any),
        error: (err) => alert(String(err?.error?.detail || 'Falha ao inativar'))
      });
    } else {
      this.api.ativarProduto(row.Idproduto).subscribe({
        next: (resp) => this.replaceRow(resp as any),
        error: (err) => alert(String(err?.error?.detail || 'Falha ao ativar'))
      });
    }
  }

  async toggleBloqueio(row: Produto) {
    if (!row.Idproduto) return;
    if (row.bloqueado_venda) {
      this.api.desbloquearVenda(row.Idproduto).subscribe({
        next: (resp: any) => this.replaceRow(resp),
        error: (err) => alert(String(err?.error?.detail || 'Falha ao desbloquear'))
      });
    } else {
      const motivo = prompt('Motivo do bloqueio (mín. 3 caracteres):', '');
      if (motivo === null || motivo.trim().length < 3) return;
      const senha = prompt('Senha:', '');
      if (!senha) return;
      this.api.bloquearVenda(row.Idproduto, motivo.trim(), senha).subscribe({
        next: (resp: any) => this.replaceRow(resp),
        error: (err) => alert(String(err?.error?.detail || 'Falha ao bloquear'))
      });
    }
  }

  private replaceRow(newRow: Produto) {
    const rows = this.produtos().slice();
    const ix = rows.findIndex(r => r.Idproduto === newRow.Idproduto);
    if (ix >= 0) rows[ix] = newRow;
    this.produtos.set(rows);
  }

  // overlay
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;

    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 120 caracteres.');
    }
    if (f['descricao_reduzida']?.invalid && f['descricao_reduzida'].errors?.['maxlength'])
      msgs.push('Descrição reduzida: máx. 60 caracteres.');

    if (f['unidade']?.invalid && f['unidade'].errors?.['required'])
      msgs.push('Unidade: obrigatória.');

    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['pattern']) msgs.push('NCM: use ####.##.##.');
      if ((f as any)['ncm']?.errors?.['server']) msgs.push(`NCM: ${(f as any)['ncm']?.errors?.['server']}`);
    }

    for (const k of Object.keys(f)) {
      if ((f as any)[k].errors?.['server'] && !msgs.some(m => m.includes(k)))
        msgs.push(`${k}: ${(f as any)[k].errors?.['server']}`);
    }
    return msgs;
  }

  openErrorOverlay() { this.errorOverlayOpen.set(true); }
  closeErrorOverlay() { this.errorOverlayOpen.set(false); }
}
