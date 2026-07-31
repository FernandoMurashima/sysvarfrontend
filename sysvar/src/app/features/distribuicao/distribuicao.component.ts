import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Distribuicao, DistribuicaoDestino, DistribuicaoItem, DistribuicaoStatus, PerfilDistribuicao } from '../../core/models/distribuicao';
import { Loja } from '../../core/models/loja';
import { DistribuicaoService } from '../../core/services/distribuicao.service';
import { LojasService } from '../../core/services/lojas.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-distribuicao',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './distribuicao.component.html',
  styleUrls: ['./distribuicao.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistribuicaoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(DistribuicaoService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  saving = false;
  showForm = false;
  showPerfilModal = false;
  perfilEditandoId: number | null = null;
  detalheAberto = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  filterOrigem = '';
  filterStatus = '';
  filterDataIni = '';
  filterDataFim = '';
  estoqueSearch = '';
  manterMinimo = 0;
  distribuirDisponivel = true;
  indicatorsVisible = true;
  filtersVisible = true;
  columnsOpen = false;
  advancedOpen = false;
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  lojas: Loja[] = [];
  perfis: PerfilDistribuicao[] = [];
  distribuicoes: Distribuicao[] = [];
  distribuicoesFiltradas: Distribuicao[] = [];
  distribuicoesPaginadas: Distribuicao[] = [];
  selecionada: Distribuicao | null = null;
  pedidosGerados: string[] = [];
  estoqueDisponivel: any[] = [];
  matrizItensView: DistribuicaoItem[] = [];
  matrizLojasView: { id: number; nome: string; titulo: string }[] = [];
  matrizCells = new Map<string, DistribuicaoDestino>();
  totaisItem = new Map<number, number>();
  saldosItem = new Map<number, number>();
  totaisLoja = new Map<number, number>();
  totalPagesView = 1;
  pageStartView = 0;
  pageEndView = 0;

  readonly viewPrefsKey = 'sysvar.ui.preferences.distribuicao';

  form = this.fb.group({
    unidade_origem: [null as number | null, Validators.required],
    data: [this.today(), Validators.required],
    perfil: [null as number | null],
    fator_preco: [0.2, Validators.required],
    observacao: [''],
  });

  perfilForm = this.fb.group({
    codigo: ['', Validators.required],
    descricao: ['', Validators.required],
    tipo: ['PERCENTUAL', Validators.required],
    fator_preco: [0.2, Validators.required],
    ativo: [true],
  });
  perfilItens: Array<{ id?: number; loja: Loja; ativo: boolean; percentual: number; quantidade_fixa: number; prioridade: number }> = [];

  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('estoque', true) !== false; }
  get lojasDestino(): Loja[] { return this.lojas.filter(l => l.ativo !== false && l.id !== this.selecionada?.unidade_origem && l.tipo_unidade !== 'FABRICA'); }
  get lojasPerfil(): Loja[] { return this.lojas.filter(l => l.ativo !== false && l.tipo_unidade !== 'FABRICA'); }
  get totalDistribuicoes(): number { return this.distribuicoes.length; }
  get rascunhos(): number { return this.distribuicoes.filter(d => d.status === 'RASC' || d.status === 'CALC').length; }
  get confirmadas(): number { return this.distribuicoes.filter(d => d.status === 'CONF').length; }
  get comPedidos(): number { return this.distribuicoes.filter(d => d.status === 'PED').length; }
  get totalPecas(): number { return this.distribuicoes.reduce((sum, d) => sum + this.num(d.quantidade_total), 0); }

  ngOnInit(): void {
    this.loadViewPreference();
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 500, ordering: 'nome_loja' }),
      perfis: this.api.listPerfis({ ativo: 'true', page_size: 500 }),
      distribuicoes: this.api.list(this.queryParams()),
    }).subscribe({
      next: result => {
        this.lojas = this.unwrap<Loja>(result.lojas);
        this.perfis = this.unwrap<PerfilDistribuicao>(result.perfis);
        this.distribuicoes = this.unwrap<Distribuicao>(result.distribuicoes);
        this.updateListView();
        if (this.selecionada?.id) {
          const resumo = this.distribuicoes.find(d => d.id === this.selecionada?.id);
          if (resumo) {
            this.selecionada = {
              ...resumo,
              itens: this.selecionada.itens,
              destinos: this.selecionada.destinos,
            };
            this.prepareMatrix();
          }
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar distribuição.');
        this.cdr.markForCheck();
      },
    });
  }

  novo(): void {
    if (!this.podeEditarModulo) return;
    this.showForm = true;
    const origem = this.lojas.find(l => l.tipo_unidade === 'FABRICA') || this.lojas[0];
    const perfil = this.perfis[0] || null;
    this.form.reset({ unidade_origem: origem?.id || null, data: this.today(), perfil: perfil?.id || null, fator_preco: this.num(perfil?.fator_preco ?? 0.2), observacao: '' });
  }

  abrirPerfilModal(perfil?: PerfilDistribuicao | null): void {
    this.perfilEditandoId = perfil?.id || null;
    this.perfilForm.reset({
      codigo: perfil?.codigo || '',
      descricao: perfil?.descricao || '',
      tipo: perfil?.tipo || 'PERCENTUAL',
      fator_preco: this.num(perfil?.fator_preco ?? 0.2),
      ativo: perfil?.ativo !== false,
    });
    const lojas = this.lojasPerfil;
    const percentualBase = lojas.length ? Number((100 / lojas.length).toFixed(4)) : 0;
    const itens = new Map((perfil?.itens || []).map(item => [Number(item.loja), item]));
    this.perfilItens = lojas.map((loja, index) => ({
      id: itens.get(Number(loja.id))?.id,
      loja,
      ativo: itens.get(Number(loja.id))?.ativo ?? true,
      percentual: this.num(itens.get(Number(loja.id))?.percentual ?? (index === lojas.length - 1 ? Number((100 - percentualBase * (lojas.length - 1)).toFixed(4)) : percentualBase)),
      quantidade_fixa: this.num(itens.get(Number(loja.id))?.quantidade_fixa ?? 0),
      prioridade: Number(itens.get(Number(loja.id))?.prioridade ?? index + 1),
    }));
    this.showPerfilModal = true;
    this.cdr.markForCheck();
  }

  novoPerfil(): void { this.abrirPerfilModal(null); }

  editarPerfilSelecionado(): void {
    const perfil = this.perfis.find(p => p.id === Number(this.form.value.perfil));
    this.abrirPerfilModal(perfil || null);
  }

  onPerfilChange(perfilId: number | null | undefined): void {
    const perfil = this.perfis.find(p => p.id === Number(perfilId));
    if (perfil) this.form.patchValue({ fator_preco: this.num(perfil.fator_preco ?? 0.2) });
  }

  salvar(): void {
    if (!this.podeEditarModulo || this.form.invalid) return;
    this.saving = true;
    const raw = this.form.value;
    this.api.create({
      unidade_origem: Number(raw.unidade_origem),
      data: String(raw.data),
      perfil: raw.perfil ? Number(raw.perfil) : null,
      fator_preco: Number(raw.fator_preco || 0),
      tipo: 'MANUAL',
      origem_operacao: 'MANUAL',
      observacao: String(raw.observacao || ''),
    }).subscribe({
      next: dist => {
        this.saving = false;
        this.showForm = false;
        this.selecionada = dist;
        this.prepareMatrix();
        this.successMsg = 'Distribuição criada.';
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.errorText(err, 'Falha ao criar distribuição.');
        this.cdr.markForCheck();
      },
    });
  }

  carregarEstoque(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.loading = true;
    this.api.carregarEstoque(this.selecionada.id, { search: this.estoqueSearch, manter_minimo: this.distribuirDisponivel ? 0 : this.manterMinimo }).subscribe({
      next: res => {
        if (!res.itens_criados) {
          this.loading = false;
          this.successMsg = 'Nenhum SKU disponível para carregar.';
          this.cdr.markForCheck();
          this.refreshSelecionada();
          return;
        }
        this.montarMatrizAposCarga(res.itens_criados);
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar estoque.');
        this.cdr.markForCheck();
      },
    });
  }

  verReferenciasDisponiveis(): void {
    const origem = this.selecionada?.unidade_origem || this.form.value.unidade_origem;
    if (!origem) {
      this.errorMsg = 'Selecione a origem para consultar as referências disponíveis.';
      return;
    }
    this.loading = true;
    this.api.estoqueDisponivel({ origem: Number(origem), search: this.estoqueSearch }).subscribe({
      next: rows => {
        this.loading = false;
        this.estoqueDisponivel = rows || [];
        this.successMsg = `${this.estoqueDisponivel.length} SKU(s) disponível(is) na origem.`;
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao consultar referências disponíveis.');
        this.cdr.markForCheck();
      },
    });
  }

  aplicarPerfilSelecionado(): void {
    if (!this.selecionada?.id || !this.selecionada.perfil || !this.podeEditarModulo) return;
    this.loading = true;
    this.api.aplicarPerfil(this.selecionada.id, Number(this.selecionada.perfil)).subscribe({
      next: dist => {
        this.loading = false;
        this.selecionada = dist;
        this.prepareMatrix();
        this.successMsg = 'Perfil aplicado.';
        this.load();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao aplicar perfil.');
        this.cdr.markForCheck();
      },
    });
  }

  private montarMatrizAposCarga(itensCriados: number): void {
    const id = this.selecionada?.id;
    if (!id) {
      this.loading = false;
      this.errorMsg = 'Distribuição não selecionada.';
      this.cdr.markForCheck();
      return;
    }
    const perfil = this.selecionada?.perfil ? Number(this.selecionada.perfil) : null;
    const finalizar = (mensagem: string) => {
      this.successMsg = mensagem;
      this.refreshSelecionada();
    };
    if (perfil) {
      this.api.aplicarPerfil(id, perfil).subscribe({
        next: dist => {
          this.selecionada = dist;
          this.prepareMatrix();
          finalizar(`${itensCriados} SKU(s) carregado(s) e perfil aplicado.`);
        },
        error: () => {
          this.api.montarMatriz(id).subscribe({
            next: res => finalizar(`${itensCriados} SKU(s) carregado(s). Matriz criada com ${res.lojas} loja(s).`),
            error: err => {
              this.loading = false;
              this.errorMsg = this.errorText(err, 'SKU(s) carregado(s), mas não foi possível montar as lojas.');
              this.cdr.markForCheck();
              this.refreshSelecionada();
            },
          });
        },
      });
      return;
    }
    this.api.montarMatriz(id).subscribe({
      next: res => finalizar(`${itensCriados} SKU(s) carregado(s). Matriz criada com ${res.lojas} loja(s).`),
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'SKU(s) carregado(s), mas não foi possível montar as lojas.');
        this.cdr.markForCheck();
        this.refreshSelecionada();
      },
    });
  }

  montarMatrizManual(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.loading = true;
    this.api.montarMatriz(this.selecionada.id).subscribe({
      next: res => {
        this.selecionada = res.distribuicao;
        this.prepareMatrix();
        this.successMsg = `Matriz manual montada com ${res.lojas} loja(s).`;
        this.refreshSelecionada();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao montar matriz manual.');
        this.cdr.markForCheck();
      },
    });
  }

  ajustarDestino(destino: DistribuicaoDestino, value: string): void {
    if (!this.selecionada?.id || !destino.id || !this.podeEditarModulo) return;
    const quantidade = Number(value || 0);
    destino.quantidade_ajustada = quantidade;
    destino.bloqueado_recalculo = true;
    this.prepareMatrix();
    this.cdr.markForCheck();
    this.api.atualizarDestino(this.selecionada.id, destino.id, quantidade).subscribe({
      next: () => this.refreshSelecionada(false),
      error: err => this.errorMsg = this.errorText(err, 'Falha ao ajustar quantidade.'),
    });
  }

  confirmar(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.api.confirmar(this.selecionada.id).subscribe({
      next: dist => {
        this.selecionada = dist;
        this.prepareMatrix();
        this.successMsg = 'Distribuição confirmada e estoque reservado.';
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao confirmar distribuição.'),
    });
  }

  gerarPedidos(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.api.gerarPedidos(this.selecionada.id).subscribe({
      next: pedidos => {
        this.pedidosGerados = pedidos.map(p => p.numero);
        this.successMsg = `${pedidos.length} pedido(s) de venda gerado(s).`;
        this.refreshSelecionada();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao gerar pedidos.'),
    });
  }

  cancelar(): void {
    if (!this.selecionada?.id || !this.podeEditarModulo) return;
    this.api.cancelar(this.selecionada.id, 'Cancelado pela tela de distribuição').subscribe({
      next: dist => {
        this.selecionada = dist;
        this.prepareMatrix();
        this.successMsg = 'Distribuição cancelada.';
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao cancelar distribuição.'),
    });
  }

  selecionar(dist: Distribuicao): void {
    if (!dist.id) return;
    this.api.get(dist.id).subscribe({
      next: full => {
        this.selecionada = full;
        this.detalheAberto = true;
        this.prepareMatrix();
        this.estoqueSearch = '';
        this.manterMinimo = 0;
        this.estoqueDisponivel = [];
        this.cdr.markForCheck();
        if (!full.itens?.length) this.verReferenciasDisponiveis();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao consultar distribuição.'),
    });
  }

  fecharDetalhe(): void {
    this.detalheAberto = false;
    this.selecionada = null;
    this.matrizItensView = [];
    this.matrizLojasView = [];
    this.estoqueDisponivel = [];
    this.cdr.markForCheck();
  }

  criarPerfilRapido(): void {
    this.salvarPerfil();
  }

  salvarPerfil(): void {
    if (!this.podeEditarModulo || this.perfilForm.invalid) return;
    const raw = this.perfilForm.value;
    const tipo = raw.tipo as any;
    const ativos = this.perfilItens.filter(item => item.ativo);
    if (tipo === 'PERCENTUAL') {
      const total = ativos.reduce((sum, item) => sum + Number(item.percentual || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        this.errorMsg = `Percentual do perfil deve fechar 100%. Atual: ${total.toLocaleString('pt-BR')}%.`;
        this.cdr.markForCheck();
        return;
      }
    }
    const payload = { codigo: String(raw.codigo), descricao: String(raw.descricao), tipo, fator_preco: Number(raw.fator_preco || 0), ativo: raw.ativo !== false };
    const request = this.perfilEditandoId ? this.api.updatePerfil(this.perfilEditandoId, payload) : this.api.createPerfil(payload);
    request.subscribe({
      next: perfil => {
        const requests = this.perfilItens.map(item => {
          const itemPayload = {
            perfil: perfil.id,
            loja: Number(item.loja.id),
            percentual: tipo === 'PERCENTUAL' ? item.percentual : 0,
            quantidade_fixa: tipo === 'FIXA' ? item.quantidade_fixa : 0,
            prioridade: item.prioridade,
            ativo: item.ativo,
          };
          return item.id ? this.api.updatePerfilItem(item.id, itemPayload) : this.api.createPerfilItem(itemPayload);
        });
        if (!requests.length) {
          this.finalizarPerfilCriado(perfil);
          return;
        }
        forkJoin(requests).subscribe({
          next: () => this.finalizarPerfilCriado(perfil),
          error: err => {
            this.errorMsg = this.errorText(err, 'Perfil criado, mas falhou ao gravar lojas.');
            this.cdr.markForCheck();
          },
        });
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao criar perfil.');
        this.cdr.markForCheck();
      },
    });
  }

  private finalizarPerfilCriado(perfil: PerfilDistribuicao): void {
    this.showPerfilModal = false;
    this.perfilEditandoId = null;
    this.successMsg = 'Perfil salvo.';
    this.api.listPerfis({ ativo: 'true', page_size: 500 }).subscribe({
      next: resp => {
        this.perfis = this.unwrap<PerfilDistribuicao>(resp);
        this.form.patchValue({ perfil: perfil.id || null, fator_preco: this.num(perfil.fator_preco ?? 0.2) });
        this.cdr.markForCheck();
      },
      error: () => {
        this.perfis = [...this.perfis, perfil];
        this.cdr.markForCheck();
      },
    });
  }

  refreshSelecionada(reloadList = true): void {
    if (!this.selecionada?.id) {
      this.loading = false;
      return;
    }
    this.api.get(this.selecionada.id).subscribe({
      next: dist => {
        this.selecionada = dist;
        this.prepareMatrix();
        this.loading = false;
        if (reloadList) {
          this.api.list(this.queryParams()).subscribe({
            next: resp => {
              this.distribuicoes = this.unwrap<Distribuicao>(resp);
              this.updateListView();
              this.cdr.markForCheck();
            },
            error: () => {},
          });
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.filterOrigem = ''; this.filterStatus = ''; this.filterDataIni = ''; this.filterDataFim = ''; this.estoqueSearch = ''; this.estoqueDisponivel = []; this.page = 1; this.load(); }
  firstPage(): void { this.page = 1; this.updateListView(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.updateListView(); } }
  nextPage(): void { if (this.page < this.totalPagesView) { this.page++; this.updateListView(); } }
  lastPage(): void { this.page = this.totalPagesView; this.updateListView(); }
  onPageSizeChange(value: string): void { this.pageSize = Number(value) || 20; this.page = 1; localStorage.setItem('sysvar.list.distribuicao.pageSize', String(this.pageSize)); this.updateListView(); }
  toggleIndicators(): void { this.indicatorsVisible = !this.indicatorsVisible; this.saveViewPreference(); this.cdr.markForCheck(); }
  toggleFilters(): void { this.filtersVisible = !this.filtersVisible; this.saveViewPreference(); this.cdr.markForCheck(); }
  restoreViewPreference(): void { localStorage.removeItem(this.viewPrefsKey); this.indicatorsVisible = true; this.filtersVisible = true; this.pageSize = 20; this.cdr.markForCheck(); }

  private updateListView(): void {
    const term = this.search.trim().toLowerCase();
    this.distribuicoesFiltradas = this.distribuicoes.filter(d => {
      const matchesTerm = !term || [d.numero, d.unidade_origem_nome, d.observacao].some(v => String(v || '').toLowerCase().includes(term));
      return matchesTerm;
    });
    this.totalPagesView = Math.max(1, Math.ceil(this.distribuicoesFiltradas.length / this.pageSize));
    if (this.page > this.totalPagesView) this.page = this.totalPagesView;
    this.distribuicoesPaginadas = this.distribuicoesFiltradas.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    this.pageStartView = this.distribuicoesFiltradas.length ? (this.page - 1) * this.pageSize + 1 : 0;
    this.pageEndView = Math.min(this.distribuicoesFiltradas.length, this.page * this.pageSize);
    this.cdr.markForCheck();
  }

  private prepareMatrix(): void {
    this.matrizItensView = this.selecionada?.itens || [];
    const map = new Map<number, string>();
    (this.selecionada?.destinos || []).forEach(d => map.set(d.loja_destino, d.loja_nome || this.lojaNome(d.loja_destino)));
    this.matrizItensView.forEach(item => (item.destinos || []).forEach(d => map.set(d.loja_destino, d.loja_nome || this.lojaNome(d.loja_destino))));
    this.matrizLojasView = Array.from(map.entries()).map(([id, nome]) => ({ id, nome: this.lojaNomeCurto(id), titulo: nome }));
    this.matrizCells = new Map<string, DistribuicaoDestino>();
    this.totaisItem = new Map<number, number>();
    this.saldosItem = new Map<number, number>();
    this.totaisLoja = new Map<number, number>();
    this.matrizItensView.forEach(item => {
      let totalItem = 0;
      (item.destinos || []).forEach(destino => {
        const qtd = this.num(destino.quantidade_ajustada || destino.quantidade_sugerida);
        this.matrizCells.set(`${item.id}-${destino.loja_destino}`, destino);
        totalItem += qtd;
        this.totaisLoja.set(destino.loja_destino, (this.totaisLoja.get(destino.loja_destino) || 0) + qtd);
      });
      this.totaisItem.set(Number(item.id), totalItem);
      this.saldosItem.set(Number(item.id), this.num(item.quantidade_selecionada) - totalItem);
    });
  }

  get matrizItens(): DistribuicaoItem[] { return this.matrizItensView; }
  get matrizLojas(): { id: number; nome: string; titulo: string }[] { return this.matrizLojasView; }
  destinoCell(item: DistribuicaoItem, lojaId: number): DistribuicaoDestino | null { return this.matrizCells.get(`${item.id}-${lojaId}`) || null; }
  totalItem(item: DistribuicaoItem): number { return this.totaisItem.get(Number(item.id)) || 0; }
  saldoItem(item: DistribuicaoItem): number { return this.saldosItem.get(Number(item.id)) || this.num(item.quantidade_selecionada); }
  totalLoja(lojaId: number): number { return this.totaisLoja.get(lojaId) || 0; }
  custoUnitarioDist(dist: Distribuicao | null): number { return dist && this.num(dist.quantidade_total) ? this.num(dist.valor_total_custo) / this.num(dist.quantidade_total) : 0; }
  vendaUnitarioDist(dist: Distribuicao | null): number { return dist && this.num(dist.quantidade_total) ? this.num(dist.valor_total_venda) / this.num(dist.quantidade_total) : 0; }
  isSelected(dist: Distribuicao): boolean { return this.selecionada?.id === dist.id; }
  trackByDistribuicao(_: number, item: Distribuicao): number | string { return item.id || item.numero; }
  trackByItem(_: number, item: DistribuicaoItem): number | string { return item.id || item.ean13; }
  trackByLoja(_: number, item: { id: number; nome: string }): number { return item.id; }
  trackByEstoque(_: number, item: any): string | number { return item.ean13 || item.sku; }
  lojaNome(id?: number | null): string { return this.lojas.find(l => l.id === id)?.nome_loja || '-'; }
  lojaNomeCurto(id?: number | null): string {
    const loja = this.lojas.find(l => l.id === id);
    if (!loja) return String(id || '-');
    return (loja.apelido_loja || loja.Apelido_loja || loja.nome_loja || String(id)).replace(/^Loja\s+/i, '').slice(0, 8);
  }
  statusLabel(status?: DistribuicaoStatus): string {
    const labels: Record<string, string> = { RASC: 'Rascunho', CALC: 'Calculada', CONF: 'Confirmada', PED: 'Pedidos', FATUR: 'Faturamento', NF: 'Faturada', TRANS: 'Transito', PARC: 'Parcial', RECB: 'Recebida', CANC: 'Cancelada' };
    return labels[status || ''] || String(status || '');
  }
  statusClass(status?: DistribuicaoStatus): string { return `st-${String(status || '').toLowerCase()}`; }
  num(v: unknown): number { return Number(v || 0); }
  money(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  qty(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  qtyInt(v: unknown): string { return Math.round(this.num(v)).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
  qtyInput(v: unknown): number { return Math.round(this.num(v)); }

  @HostListener('window:sysvar-distribuicao-toggle-indicators') onToggleIndicators() { this.toggleIndicators(); }
  @HostListener('window:sysvar-distribuicao-toggle-filters') onToggleFilters() { this.toggleFilters(); }
  @HostListener('window:sysvar-distribuicao-restore-view') onRestoreView() { this.restoreViewPreference(); }

  private queryParams(): Record<string, string | number | null | undefined> {
    return { search: this.search, origem: this.filterOrigem, status: this.filterStatus, data_ini: this.filterDataIni, data_fim: this.filterDataFim, page_size: 500 };
  }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] { return Array.isArray(resp) ? resp : (resp?.results || []); }
  private loadViewPreference(): void {
    try {
      const raw = JSON.parse(localStorage.getItem(this.viewPrefsKey) || '{}');
      this.indicatorsVisible = raw.indicatorsVisible !== false;
      this.filtersVisible = raw.filtersVisible !== false;
      this.pageSize = Number(localStorage.getItem('sysvar.list.distribuicao.pageSize') || 20);
    } catch {}
  }
  private saveViewPreference(): void { localStorage.setItem(this.viewPrefsKey, JSON.stringify({ indicatorsVisible: this.indicatorsVisible, filtersVisible: this.filtersVisible })); }
  private errorText(err: any, fallback: string): string {
    const data = err?.error;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    return String(first || fallback);
  }
}
