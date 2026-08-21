import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Cotacao, CotacaoItem, CotacaoTipoCompra } from '../../core/models/cotacao';
import { Produto } from '../../core/models/produto';
import { CotacoesService } from '../../core/services/cotacoes.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';
import { UnidadesService } from '../../core/services/unidades.service';

type Option = { id: number; label: string };

@Component({
  selector: 'app-cotacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cotacoes.component.html',
  styleUrls: ['./cotacoes.component.css'],
})
export class CotacoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CotacoesService);
  private produtosApi = inject(ProdutosService);
  private requisicoesApi = inject(RequisicoesService);
  private unidadesApi = inject(UnidadesService);
  private auth = inject(AuthService);

  view: 'list' | 'form' = 'list';
  cotacoes: Cotacao[] = [];
  lojas: Option[] = [];
  produtos: Produto[] = [];
  unidades: Option[] = [];
  itens: CotacaoItem[] = [];
  itemEditando: CotacaoItem | null = null;
  atual: Cotacao | null = null;
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    loja: [null as number | null, Validators.required],
    data_limite_propostas: [''],
    prioridade: ['NORMAL', Validators.required],
    tipo_compra: ['OUTRO' as CotacaoTipoCompra, Validators.required],
    observacao: [''],
  });

  itemForm = this.fb.group({
    modo: ['PRODUTO' as 'PRODUTO' | 'AVULSO'],
    produto: [null as number | null],
    descricao: [''],
    quantidade_cotar: [1, [Validators.required, Validators.min(0.001)]],
    unidade: [null as number | null],
    especificacao_tecnica: [''],
    marca_desejada: [''],
    modelo_referencia: [''],
    permite_alternativo: [true],
    observacao: [''],
  });

  ngOnInit(): void {
    this.loadLojas();
    this.loadProdutos();
    this.loadUnidades();
    this.loadCotacoes();
  }

  get podeEditar(): boolean {
    return this.auth.podeAcessarModulo('compras', true) === true;
  }

  get currentUser(): any {
    return this.auth.getCurrentUser();
  }

  get podeEditarItens(): boolean {
    return this.podeEditar && this.atual?.status === 'EM_ELABORACAO';
  }

  loadCotacoes(): void {
    this.loading = true;
    this.api.listar({ page_size: 500 }).subscribe({
      next: resp => {
        this.cotacoes = Array.isArray(resp) ? resp : resp.results || [];
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao carregar cotações.');
        this.loading = false;
      },
    });
  }

  loadLojas(): void {
    this.requisicoesApi.lojasPermitidas().subscribe({
      next: resp => {
        this.lojas = (Array.isArray(resp) ? resp : resp.results || [])
          .map(l => ({ id: Number(l.id ?? l.Idloja), label: `${l.id ?? l.Idloja} - ${l.nome_loja}` }))
          .filter(l => !!l.id);
        this.selecionarLojaUnica();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar lojas permitidas.'),
    });
  }

  selecionarLojaUnica(): void {
    if (this.lojas.length === 1 && !this.form.value.loja) {
      this.form.patchValue({ loja: this.lojas[0].id });
    }
  }

  loadProdutos(): void {
    this.produtosApi.list({ page_size: 500, ordering: 'descricao' }).subscribe({
      next: resp => this.produtos = Array.isArray(resp) ? resp : resp.results || [],
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar produtos.'),
    });
  }

  loadUnidades(): void {
    this.unidadesApi.list({ page_size: 500, ordering: 'Descricao' }).subscribe({
      next: resp => {
        this.unidades = (Array.isArray(resp) ? resp : resp.results || [])
          .map((u: any) => ({ id: Number(u.Idunidade ?? u.id), label: u.Descricao || u.descricao || u.Codigo || u.codigo }))
          .filter((u: Option) => !!u.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar unidades.'),
    });
  }

  nova(): void {
    this.atual = null;
    this.itens = [];
    this.limparItem();
    this.form.reset({ loja: null, data_limite_propostas: '', prioridade: 'NORMAL', tipo_compra: 'OUTRO', observacao: '' });
    this.selecionarLojaUnica();
    this.view = 'form';
  }

  abrir(cotacao: Cotacao): void {
    this.atual = cotacao;
    this.form.reset({
      loja: cotacao.loja,
      data_limite_propostas: cotacao.data_limite_propostas || '',
      prioridade: cotacao.prioridade || 'NORMAL',
      tipo_compra: cotacao.tipo_compra || 'OUTRO',
      observacao: cotacao.observacao || '',
    });
    this.view = 'form';
    this.loadItens(cotacao.id);
  }

  voltar(): void {
    this.view = 'list';
    this.atual = null;
    this.errorMsg = '';
  }

  salvar(): void {
    if (!this.podeEditar || this.form.invalid || this.saving) return;
    this.saving = true;
    this.errorMsg = '';
    const raw = this.form.getRawValue();
    const payload: Partial<Cotacao> = {
      loja: raw.loja || undefined,
      data_limite_propostas: raw.data_limite_propostas || null,
      prioridade: raw.prioridade as any,
      tipo_compra: raw.tipo_compra as CotacaoTipoCompra,
      observacao: raw.observacao || '',
    };
    const req = this.atual ? this.api.atualizar(this.atual.id, payload) : this.api.criar(payload);
    req.subscribe({
      next: cotacao => {
        this.saving = false;
        this.successMsg = 'Cotação salva.';
        this.atual = cotacao;
        this.view = 'list';
        this.loadCotacoes();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.errorText(err, 'Falha ao salvar cotação.');
      },
    });
  }

  loadItens(cotacaoId: number): void {
    this.api.listarItens(cotacaoId).subscribe({
      next: resp => this.itens = Array.isArray(resp) ? resp : resp.results || [],
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar itens.'),
    });
  }

  produtoSelecionado(): void {
    const id = Number(this.itemForm.value.produto || 0);
    const produto = this.produtos.find(p => Number(p.Idproduto) === id);
    if (!produto) return;
    this.itemForm.patchValue({ descricao: produto.descricao || '', unidade: produto.unidade || null });
  }

  limparItem(): void {
    this.itemEditando = null;
    this.itemForm.reset({ modo: 'PRODUTO', produto: null, descricao: '', quantidade_cotar: 1, unidade: null, especificacao_tecnica: '', marca_desejada: '', modelo_referencia: '', permite_alternativo: true, observacao: '' });
  }

  editarItem(item: CotacaoItem): void {
    this.itemEditando = item;
    this.itemForm.reset({
      modo: item.produto ? 'PRODUTO' : 'AVULSO',
      produto: item.produto || null,
      descricao: item.descricao || '',
      quantidade_cotar: Number(item.quantidade_cotar || 0),
      unidade: item.unidade || null,
      especificacao_tecnica: item.especificacao_tecnica || '',
      marca_desejada: item.marca_desejada || '',
      modelo_referencia: item.modelo_referencia || '',
      permite_alternativo: item.permite_alternativo !== false,
      observacao: item.observacao || '',
    });
  }

  salvarItem(): void {
    if (!this.atual || !this.podeEditarItens || this.itemForm.invalid) return;
    const raw = this.itemForm.getRawValue();
    const produtoId = raw.modo === 'PRODUTO' ? raw.produto : null;
    const payload: Partial<CotacaoItem> = {
      cotacao: this.atual.id,
      origem: 'AVULSO',
      produto: produtoId || null,
      descricao: produtoId ? '' : raw.descricao || '',
      quantidade_cotar: raw.quantidade_cotar || 0,
      unidade: raw.unidade || undefined,
      especificacao_tecnica: raw.especificacao_tecnica || '',
      marca_desejada: raw.marca_desejada || '',
      modelo_referencia: raw.modelo_referencia || '',
      permite_alternativo: raw.permite_alternativo !== false,
      observacao: raw.observacao || '',
    };
    const req = this.itemEditando ? this.api.atualizarItem(this.itemEditando.id, payload) : this.api.criarItem(payload);
    req.subscribe({
      next: () => {
        this.limparItem();
        this.loadItens(this.atual!.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao salvar item.'),
    });
  }

  excluirItem(item: CotacaoItem): void {
    if (!this.podeEditarItens) return;
    this.api.excluirItem(item.id).subscribe({
      next: () => this.loadItens(this.atual!.id),
      error: err => this.errorMsg = this.errorText(err, 'Falha ao excluir item.'),
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      EM_ELABORACAO: 'Em elaboração',
      ABERTA: 'Aberta',
      PROPOSTAS_RECEBIDAS: 'Propostas recebidas',
      EM_ANALISE: 'Em análise',
      AGUARDANDO_APROVACAO: 'Aguardando aprovação',
      APROVADA: 'Aprovada',
      REJEITADA: 'Rejeitada',
      CANCELADA: 'Cancelada',
      PEDIDO_GERADO: 'Pedido gerado',
      ENCERRADA: 'Encerrada',
    };
    return labels[status || 'EM_ELABORACAO'] || status || '';
  }

  tipoLabel(tipo?: string): string {
    const labels: Record<string, string> = { REVENDA: 'Revenda', USO_CONSUMO: 'Uso/Consumo', INSUMO: 'Insumo', SERVICO: 'Serviço', OUTRO: 'Outro' };
    return labels[tipo || 'OUTRO'] || tipo || '';
  }

  private errorText(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.detail) return err.error.detail;
    const first = err?.error && Object.values(err.error)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (first) return String(first);
    return fallback;
  }
}
