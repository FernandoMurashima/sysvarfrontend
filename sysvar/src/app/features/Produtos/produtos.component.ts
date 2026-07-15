import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { ProdutosService } from '../../core/services/produtos.service';
import { Produto } from '../../core/models/produto';
import { Estoque } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';

import { ColecoesService } from '../../core/services/colecoes.service';
import { GruposService } from '../../core/services/grupos.service';
import { SubgruposService } from '../../core/services/subgrupos.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { GradesService } from '../../core/services/grades.service';
import { NcmsService } from '../../core/services/ncms.service';
import { MateriaisService } from '../../core/services/material.service';
import { TabelaprecoService } from '../../core/services/tabelapreco.service';

import { LojasSelectorComponent } from '../../shared/lojas-selector/lojas-selector.component';

// Cores (selector + serviço)
import { CoresSelectorComponent, CorRow } from '../../shared/cores-selector/cores-selector.component';
import { CoresService } from '../../core/services/cores.service';

// preço
import { TabelaprecoProdutoService, TabelaPrecoProduto } from '../../core/services/tabelapreco-produto.service';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { AuthService } from '../../core/auth.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

type ItemRef = { id: number; label: string };

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    LojasSelectorComponent,
    CoresSelectorComponent, // <<< adiciona o selector de cores
    SearchSuggestComponent,
  ],
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.css'],
})
export class ProdutosComponent {
  private fb = inject(FormBuilder);
  private api = inject(ProdutosService);

  // lookups
  private colecoesApi = inject(ColecoesService);
  private gruposApi = inject(GruposService);
  private subgruposApi = inject(SubgruposService);
  private unidadesApi = inject(UnidadesService);
  private gradesApi = inject(GradesService);
  private ncmsApi = inject(NcmsService);
  private materiaisApi = inject(MateriaisService);
  private tabelasApi = inject(TabelaprecoService);

  // cores
  private coresApi = inject(CoresService);

  // preço
  private prodPrecoApi = inject(TabelaprecoProdutoService);
  private estoqueApi = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private skusApi = inject(ProdutoDetalheService);
  private auth = inject(AuthService);

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  // navegação
  view = signal<'list' | 'form'>('list');
  setViewList() { this.view.set('list'); this.cancelarEdicao(); this.load(); }
  setViewForm() { this.view.set('form'); }

  // flags
  search = '';
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  errorOverlayOpen = signal(false);
  submitted = false;
  saving = false;
  skuConfirmModal: { nomes: string } | null = null;
  excluirModal: Produto | null = null;
  segurancaModal: {
    action: 'inativar' | 'bloquear';
    produto: Produto;
    title: string;
    motivo: string;
    senha: string;
  } | null = null;

  // lista/pager
  produtos = signal<Produto[]>([]);
  produtoSkus = signal<ProdutoSku[]>([]);
  page = signal(1);
  pageSizeOptions = [10, 20, 50];
  pageSize = signal(20);

  // LOJAS (ids)
  lojasDisponiveis: Loja[] = [];
  lojasSelecionadasIds = signal<number[]>([]);
  lojasModalAberto = signal(false);
  abrirModalLojas() { this.lojasModalAberto.set(true); }
  fecharModalLojas() { this.lojasModalAberto.set(false); }
  confirmarLojas(sel: number[] | { ids: number[] }) {
    const ids = Array.isArray(sel) ? sel : (sel?.ids ?? []);
    this.lojasSelecionadasIds.set(ids);
    this.fecharModalLojas();
  }

  // CORES (lista + ids + modal)
  coresDisponiveis: CorRow[] = [];
  coresSelecionadasIds = signal<number[]>([]);
  coresOriginaisIds = signal<number[]>([]);
  coresModalAberto = signal(false);
  corFiltro = signal<string>(''); // opcional (não precisa usar no TS se não quiser)

  abrirModalCores() { this.coresModalAberto.set(true); }
  fecharModalCores() { this.coresModalAberto.set(false); }
  confirmarCores(ids: number[]) {
    this.coresSelecionadasIds.set(ids);
    this.fecharModalCores();
  }

  total = computed(() => this.produtos().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.produtos().slice(start, start + this.pageSize());
  });
  searchSuggestions = computed(() => this.produtos().flatMap(p => [
    p.descricao,
    p.descricao_reduzida,
    p.referencia,
    this.colecaoLabel(p.colecao ?? null),
    this.tipoProdutoLabel(p.tipo_produto),
  ].filter((v): v is string => !!v)));

  // form
  showForm = false;
  editingId: number | null = null;
  consultando = false;

  form: FormGroup = this.fb.group({
    // produto
    tipo_produto: ['1', [Validators.required]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    descricao_reduzida: [null, [Validators.maxLength(60)]],

    unidade: [null, [Validators.required]],
    grupo: [null, [Validators.required]],
    subgrupo: [null],
    colecao: [null, [Validators.required]],
    material: [null],
    grade: [null, [Validators.required]],

    ncm: [null, [Validators.required, Validators.pattern(/^\d{4}\.\d{2}\.\d{2}$/)]],

    // preço
    tabela_preco: [null],
    preco: [null, [Validators.min(0)]],
  });

  // streams/options
  ncms$: Observable<any[]> = this.ncmsApi.list('');

  colecoes: ItemRef[] = [];
  grupos: ItemRef[] = [];
  subgrupos: ItemRef[] = [];
  unidades: ItemRef[] = [];
  grades: ItemRef[] = [];
  materiais: ItemRef[] = [];
  tabelas: ItemRef[] = [];

  private colecaoMap = new Map<number, string>();
  private subGrupoSub?: Subscription;

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (this.page() > tp) this.page.set(tp);
    });

    this.loadLookups();
    this.wireGrupoToSubgrupo();
    this.load();
    this.loadCores(); // carrega as cores uma vez (lista completa)
  }

  // util
  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  // lookups
  private loadLookups() {
    this.loadLojas();

    // Coleções
    this.colecoesApi.list('').subscribe({
      next: (rows: any) => {
        const list = this.arrayOrResults<any>(rows)
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(r => ({
            id: r.Idcolecao as number,
            label: `${r.Codigo ?? '--'}/${r.Estacao ?? '--'} - ${r.Descricao}`,
          }));
        this.colecoes = list;
        this.colecaoMap.clear();
        list.forEach(x => this.colecaoMap.set(x.id, x.label));
      },
      error: () => { this.colecoes = []; }
    });

    // Grupos
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

    // Unidades
    this.unidadesApi.list({ search: '', ordering: 'Descricao', page_size: 200 }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.unidades = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(u => ({ id: u.Idunidade as number, label: u.Descricao as string }));
      },
      error: () => { this.unidades = []; }
    });

    // Grades
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (rows: any) => {
        const arr = this.arrayOrResults<any>(rows);
        this.grades = arr
          .slice()
          .sort((a, b) => (a.Descricao || '').localeCompare(b.Descricao || ''))
          .map(g => ({ id: g.Idgrade as number, label: g.Descricao as string }));
      },
      error: () => { this.grades = []; }
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

    // Tabelas de preço
    this.tabelasApi.list('').subscribe({
      next: (rows) => {
        this.tabelas = rows
          .slice()
          .sort((a: any, b: any) => (a.NomeTabela || '').localeCompare(b.NomeTabela || ''))
          .map((t: any) => ({ id: t.Idtabela as number, label: t.NomeTabela as string }));
      },
      error: () => { this.tabelas = []; }
    });

    // Subgrupos inicial
    this.loadSubgrupos(null);
  }

  private loadLojas() {
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 500 }).subscribe({
      next: (rows: any) => {
        this.lojasDisponiveis = this.arrayOrResults<Loja>(rows)
          .slice()
          .sort((a, b) => this.lojaLabel(a).localeCompare(this.lojaLabel(b)));
      },
      error: () => { this.lojasDisponiveis = []; }
    });
  }

  // Grupo -> Subgrupo
  private wireGrupoToSubgrupo() {
    this.subGrupoSub?.unsubscribe();
    this.subGrupoSub = this.form.get('grupo')?.valueChanges.subscribe((idGrupo: number | null) => {
      this.form.patchValue({ subgrupo: null }, { emitEvent: false });
      this.loadSubgrupos(idGrupo ?? null);
    });
  }

  private loadSubgrupos(idGrupo: number | null) {
    // se não houver grupo, subgrupo fica fechado (lista vazia)
    if (idGrupo == null) {
      this.subgrupos = [];
      return;
    }

    // com grupo selecionado, só traz subgrupos daquele grupo
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

  // cores
  private loadCores() {
    this.coresApi.list().subscribe({
      next: (rows: any) => {
        const data = Array.isArray(rows) ? rows : (rows?.results ?? []);
        this.coresDisponiveis = data.map((r: any) => ({
          Idcor: r.Idcor ?? r.id ?? null,
          Descricao: r.Descricao ?? r.descricao ?? '',
          Codigo: r.Codigo ?? r.codigo ?? null,
        })) as CorRow[];
      },
      error: () => { this.coresDisponiveis = []; }
    });
  }

  // lista/pager
  load() {
    this.loading.set(true);
    this.api.list({ search: this.search, ordering: '-data_cadastro', ativo: 'all', tipo_produto: '1,3', page_size: 100 }).subscribe({
      next: (data: any) => {
        const rows = this.arrayOrResults<Produto>(data)
          .filter(p => p.tipo_produto === '1' || p.tipo_produto === '3');
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

  // helpers
  colecaoLabel(id?: number | null) {
    if (!id) return '';
    return this.colecaoMap.get(id) ?? String(id);
  }

  tipoProdutoLabel(tipo?: string | null): string {
    if (tipo === '3') return 'Produto Próprio';
    return 'Revenda';
  }

  lojaId(loja: Loja | any): number | null {
    const id = loja?.Idloja ?? loja?.id;
    return typeof id === 'number' ? id : null;
  }

  lojaLabel(loja: Loja | any): string {
    return loja?.apelido_loja || loja?.Apelido_loja || loja?.nome_loja || loja?.Nome_loja || '';
  }

  lojasSelecionadasResumo(): string[] {
    const ids = new Set(this.lojasSelecionadasIds());
    const labels = this.lojasDisponiveis
      .filter(loja => {
        const id = this.lojaId(loja);
        return id != null && ids.has(id);
      })
      .map(loja => this.lojaLabel(loja))
      .filter(Boolean);

    const encontrados = new Set(
      this.lojasDisponiveis
        .map(loja => this.lojaId(loja))
        .filter((id): id is number => id != null && ids.has(id))
    );

    this.lojasSelecionadasIds()
      .filter(id => !encontrados.has(id))
      .forEach(id => labels.push(`Loja ${id}`));

    return labels;
  }

  corLabel(id: number): string {
    const cor = this.coresDisponiveis.find(c => Number(c.Idcor) === Number(id));
    if (!cor) return `Cor ${id}`;
    const codigo = cor.Codigo ? `${cor.Codigo} - ` : '';
    return `${codigo}${cor.Descricao || `Cor ${id}`}`;
  }

  coresSelecionadasResumo(): string[] {
    return this.coresSelecionadasIds().map(id => this.corLabel(id));
  }

  coresNovasSelecionadas(): number[] {
    const originais = new Set(this.coresOriginaisIds());
    return this.coresSelecionadasIds().filter(id => !originais.has(id));
  }

  // form
  novo() {
    this.setViewForm();
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.produtoSkus.set([]);
    this.form.enable({ emitEvent: false });
    this.form.reset({
      tipo_produto: '1',
      descricao: '',
      descricao_reduzida: null,
      unidade: null,
      grupo: null,
      subgrupo: null,
      colecao: null,
      material: null,
      grade: null,
      ncm: null,
      tabela_preco: null,
      preco: null,
    });
    this.loadSubgrupos(null);

    // limpa seleções auxiliares
    this.lojasSelecionadasIds.set([]);
    this.coresSelecionadasIds.set([]);
    this.coresOriginaisIds.set([]);
  }

  editar(row: Produto) {
    this.setViewForm();
    this.showForm = true;
    this.editingId = row.Idproduto!;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });

    this.form.reset({
      tipo_produto: row.tipo_produto ?? '1',
      descricao: row.descricao ?? '',
      descricao_reduzida: row.descricao_reduzida ?? null,
      unidade: row.unidade ?? null,
      grupo: row.grupo ?? null,
      subgrupo: row.subgrupo ?? null,
      colecao: row.colecao ?? null,
      material: row.material ?? null,
      grade: row.grade ?? null,
      ncm: row.ncm ?? null,
      tabela_preco: null,
      preco: null,
    });

    this.loadSubgrupos(row.grupo ?? null);

    if (row.Idproduto) {
      this.prodPrecoApi.list({ produto: row.Idproduto, ordering: '-DataInicio', page_size: 1 }).subscribe({
        next: (arr: TabelaPrecoProduto[]) => {
          const pp = (arr && arr.length) ? arr[0] : null;
          if (pp) {
            this.form.patchValue({
              tabela_preco: pp.tabela,
              preco: pp.preco
            }, { emitEvent: false });
          }
        }
      });
    }

    this.carregarVinculosProduto(row.Idproduto);
  }

  consultar(row: Produto) {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelarEdicao() {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.produtoSkus.set([]);
    this.form.enable({ emitEvent: false });
    this.form.reset();
  }

  salvar() {
    this.submitted = true;
    if (this.form.invalid) { this.openErrorOverlay(); return; }

    const coresNovas = this.coresNovasSelecionadas();
    if (coresNovas.length) {
      const nomes = coresNovas.map(id => this.corLabel(id)).join(', ');
      this.skuConfirmModal = { nomes };
      return;
    }
    this.executarSalvar();
  }

  confirmarCriacaoSkus(): void {
    this.skuConfirmModal = null;
    this.executarSalvar();
  }

  fecharCriacaoSkus(): void {
    this.skuConfirmModal = null;
  }

  private executarSalvar() {
    const body: Partial<Produto> = {
      ...this.form.value,
      tabela_preco: undefined,
      preco: undefined
    };
    this.saving = true;

    const req = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create(body);

    req.subscribe({
      next: (produtoSalvo: any) => {
        const prodId = (produtoSalvo?.Idproduto ?? this.editingId) as number | null;
        const tipo = (produtoSalvo?.tipo_produto ?? this.form.get('tipo_produto')?.value ?? '1') as '1' | '3';

        const idTabela = this.form.get('tabela_preco')?.value as number | null;
        const preco = this.form.get('preco')?.value as number | null;

        if (prodId && idTabela && preco != null && (produtoSalvo?.tipo_produto === '1' || produtoSalvo?.tipo_produto === '3')) {
          this.prodPrecoApi.upsert(idTabela, prodId, Number(preco)).subscribe({
            next: () => this.gerarSkusPosSave(prodId, tipo),
            error: () => {
              this.showError('Produto salvo, mas falhou ao gravar o preço.');
              this.gerarSkusPosSave(prodId, tipo);
            }
          });
        } else if (prodId) {
          this.gerarSkusPosSave(prodId, tipo);
        } else {
          // sem Idproduto (algo errado), apenas finaliza
          this.finishSave();
        }
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

  /** Depois de salvar o produto, gera SKUs (ProdutoDetalhe) para produtos vendáveis com cores selecionadas
   *  e, em seguida, cria estoque inicial nas lojas selecionadas (se houver).
   */
  private gerarSkusPosSave(prodId: number, tipo: '1' | '3') {
    const cores = this.coresSelecionadasIds();
    const lojas = this.lojasSelecionadasIds();

    if (!['1', '3'].includes(tipo) || !cores.length) {
      this.finishSave();
      return;
    }

    this.api.gerarSkus(prodId, cores).subscribe({
      next: (_resp: any) => {
        // se não tiver loja nenhuma marcada, termina aqui
        if (!lojas.length) {
          this.finishSave();
          return;
        }

        this.api.inicializarEstoque(prodId, lojas).subscribe({
          next: () => {
            this.finishSave();
          },
          error: (err) => {
            this.showError(String(err?.error?.detail || 'Produto/SKUs ok, mas falhou ao criar estoque inicial.'));
            this.finishSave();
          }
        });
      },
      error: (err) => {
        this.showError(String(err?.error?.detail || 'Produto salvo, mas falhou ao gerar SKUs.'));
        this.finishSave();
      }
    });
  }

  private carregarVinculosProduto(prodId?: number | null) {
    this.lojasSelecionadasIds.set([]);
    this.coresSelecionadasIds.set([]);
    this.coresOriginaisIds.set([]);
    this.produtoSkus.set([]);
    if (!prodId) return;

    this.skusApi.list({ produto: prodId, page_size: 5000 }).subscribe({
      next: (res: any) => {
        const skus = this.arrayOrResults<ProdutoSku>(res);
        this.produtoSkus.set(
          skus.slice().sort((a, b) => {
            const cor = String(a.cor_descricao || '').localeCompare(String(b.cor_descricao || ''));
            if (cor !== 0) return cor;
            return String(a.tamanho_descricao || '').localeCompare(String(b.tamanho_descricao || ''), undefined, { numeric: true });
          })
        );
        const cores = Array.from(new Set(
          skus
            .map(sku => Number(sku.idcor || 0))
            .filter(id => id > 0)
        ));
        this.coresSelecionadasIds.set(cores);
        this.coresOriginaisIds.set(cores);

        const eans = new Set(skus.map(sku => sku.ean13).filter(Boolean));
        if (!eans.size) return;

        this.estoqueApi.list({ page_size: 5000 }).subscribe({
          next: (estoqueRes: any) => {
            const estoques = this.arrayOrResults<Estoque>(estoqueRes);
            const lojas = Array.from(new Set(
              estoques
                .filter(e => eans.has(e.CodigodeBarra))
                .map(e => Number(e.Idloja || 0))
                .filter(id => id > 0)
            ));
            this.lojasSelecionadasIds.set(lojas);
          },
          error: () => this.lojasSelecionadasIds.set([])
        });
      },
      error: () => {
        this.coresSelecionadasIds.set([]);
        this.coresOriginaisIds.set([]);
        this.lojasSelecionadasIds.set([]);
        this.produtoSkus.set([]);
      }
    });
  }

  private finishSave() {
    this.saving = false;
    this.cancelarEdicao();
    this.setViewList();
    this.showSuccess(this.editingId ? 'Alterações salvas.' : 'Produto criado.');
  }

  excluir(row: Produto) {
    if (!row.Idproduto) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    const row = this.excluirModal;
    if (!row?.Idproduto) return;
    this.api.remove(row.Idproduto).subscribe({
      next: () => {
        this.excluirModal = null;
        this.showSuccess('Produto excluído.');
        this.load();
      },
      error: () => this.showError('Falha ao excluir produto.')
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  // flags
  async toggleAtivo(row: Produto) {
    if (!row.Idproduto) return;
    if (row.ativo) {
      this.segurancaModal = {
        action: 'inativar',
        produto: row,
        title: 'Inativar produto',
        motivo: '',
        senha: '',
      };
    } else {
      this.api.ativarProduto(row.Idproduto).subscribe({
        next: (resp) => {
          this.replaceRow(resp as any);
          this.showSuccess('Produto ativado.');
        },
        error: (err) => this.showError(String(err?.error?.detail || 'Falha ao ativar'))
      });
    }
  }

  async toggleBloqueio(row: Produto) {
    if (!row.Idproduto) return;
    if (row.bloqueado_venda) {
      this.api.desbloquearVenda(row.Idproduto).subscribe({
        next: (resp: any) => {
          this.replaceRow(resp);
          this.showSuccess('Produto desbloqueado.');
        },
        error: (err) => this.showError(String(err?.error?.detail || 'Falha ao desbloquear'))
      });
    } else {
      this.segurancaModal = {
        action: 'bloquear',
        produto: row,
        title: 'Bloquear venda do produto',
        motivo: '',
        senha: '',
      };
    }
  }

  confirmarSeguranca(): void {
    const modal = this.segurancaModal;
    const id = modal?.produto.Idproduto;
    if (!modal || !id) return;
    const motivo = modal.motivo.trim();
    if (motivo.length < 3 || !modal.senha) {
      this.showError('Informe motivo com pelo menos 3 caracteres e a senha.');
      return;
    }
    const req = modal.action === 'inativar'
      ? this.api.inativarProduto(id, motivo, modal.senha)
      : this.api.bloquearVenda(id, motivo, modal.senha);
    req.subscribe({
      next: (resp: any) => {
        this.replaceRow(resp);
        this.showSuccess(modal.action === 'inativar' ? 'Produto inativado.' : 'Produto bloqueado.');
        this.segurancaModal = null;
      },
      error: (err) => this.showError(String(err?.error?.detail || 'Falha ao concluir a operação.'))
    });
  }

  fecharSeguranca(): void {
    this.segurancaModal = null;
  }

  private replaceRow(newRow: Produto) {
    const rows = this.produtos().slice();
    const ix = rows.findIndex(r => r.Idproduto === newRow.Idproduto);
    if (ix >= 0) rows[ix] = newRow;
    this.produtos.set(rows);
  }

  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set(null);
  }

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set(null);
  }

  toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value).trim();
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  money(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Restrito';
    return this.toNumber(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  percent(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Restrito';
    return `${this.toNumber(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }

  // overlay
  getFormErrors(): string[] {
    const msgs: string[] = [];
    const f = this.form.controls;
    if (f['tipo_produto']?.invalid) msgs.push('Tipo de produto: obrigatório.');
    if (f['descricao']?.invalid) {
      if (f['descricao'].errors?.['required']) msgs.push('Descrição: obrigatório.');
      if (f['descricao'].errors?.['maxlength']) msgs.push('Descrição: máx. 120 caracteres.');
    }
    if (f['descricao_reduzida']?.invalid && f['descricao_reduzida'].errors?.['maxlength'])
      msgs.push('Descrição reduzida: máx. 60 caracteres.');
    for (const k of ['unidade','grupo','colecao','grade'])
      if (f[k]?.invalid) msgs.push(`${k.charAt(0).toUpperCase()+k.slice(1)}: obrigatório.`);

    if (f['ncm']?.invalid) {
      if (f['ncm'].errors?.['required']) msgs.push('NCM: obrigatório (formato ####.##.##).');
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
