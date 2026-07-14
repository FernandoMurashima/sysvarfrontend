import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FichaTecnica } from '../../core/models/ficha-tecnica';
import { OrdemProducao, OrdemProducaoStatus } from '../../core/models/ordem-producao';
import { Loja } from '../../core/models/loja';
import { FichaTecnicaService } from '../../core/services/ficha-tecnica.service';
import { LojasService } from '../../core/services/lojas.service';
import { OrdemProducaoService } from '../../core/services/ordem-producao.service';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { AuthService } from '../../core/auth.service';

interface GradeProducaoRow {
  sku: ProdutoSku;
  skuId: number;
  quantidade: number;
}

interface DistribuicaoRow {
  skuFinal: number;
  cor: string;
  tamanho: string;
  ean: string;
  produzido: number;
  quantidade: number;
}

@Component({
  selector: 'app-ordem-producao',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ordem-producao.component.html',
  styleUrls: ['./ordem-producao.component.css'],
})
export class OrdemProducaoComponent implements OnInit {
  private api = inject(OrdemProducaoService);
  private fichasApi = inject(FichaTecnicaService);
  private skusApi = inject(ProdutoDetalheService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  search = '';
  statusFiltro = '';
  sugestoesOps: OrdemProducao[] = [];
  showSugestoes = false;
  loadingSugestoes = false;
  private sugestaoTimer: any;
  successMsg = '';
  errorMsg = '';

  ordens: OrdemProducao[] = [];
  fichas: FichaTecnica[] = [];
  lojasDestino: Loja[] = [];
  skusFinal: ProdutoSku[] = [];
  gradeRows: GradeProducaoRow[] = [];
  distribuicaoRows: DistribuicaoRow[] = [];
  ordemAtual: OrdemProducao | null = null;
  form: Partial<OrdemProducao> = this.blankForm();
  distribuicao = { loja_destino: null as number | null, documento: '' };
  distribuindo = false;
  showDistribuicaoModal = false;
  estoqueValidacao: { ok: boolean; loja: string; faltas: any[] } | null = null;
  verificandoEstoque = false;

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('producao', true) !== false;
  }

  ngOnInit(): void {
    this.loadOptions();
    this.load();
  }

  loadOptions(): void {
    this.fichasApi.list({ status: 'APROVADA', ativa: 'true', page_size: 500 }).subscribe({
      next: res => this.fichas = this.unwrap<FichaTecnica>(res),
      error: () => this.fichas = [],
    });
    this.lojasApi.list({ page_size: 500 }).subscribe({
      next: res => {
        this.lojasDestino = this.unwrap<Loja>(res).filter(loja => loja.ativo !== false && loja.tipo_unidade !== 'FABRICA' && loja.tipo_unidade !== 'MATRIZ');
      },
      error: () => this.lojasDestino = [],
    });
  }

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, status: this.statusFiltro, page_size: 200 }).subscribe({
      next: res => {
        this.ordens = this.unwrap<OrdemProducao>(res);
        if (this.ordemAtual?.id) {
          const atualizada = this.ordens.find(o => o.id === this.ordemAtual?.id);
          if (atualizada) this.selectOrdem(atualizada, false);
        }
      },
      error: () => this.showError('Falha ao carregar ordens de produção.'),
      complete: () => this.loading = false,
    });
  }

  onSearchInput(): void {
    window.clearTimeout(this.sugestaoTimer);
    const termo = this.search.trim();
    if (termo.length < 2) {
      this.sugestoesOps = [];
      this.showSugestoes = false;
      return;
    }
    this.sugestaoTimer = window.setTimeout(() => this.buscarSugestoes(), 250);
  }

  buscarSugestoes(): void {
    const termo = this.search.trim();
    if (termo.length < 2) return;
    this.loadingSugestoes = true;
    this.api.list({ search: termo, status: this.statusFiltro, page_size: 8 }).subscribe({
      next: res => {
        this.sugestoesOps = this.unwrap<OrdemProducao>(res);
        this.showSugestoes = true;
      },
      error: () => {
        this.sugestoesOps = [];
        this.showSugestoes = false;
      },
      complete: () => this.loadingSugestoes = false,
    });
  }

  selecionarSugestao(ordem: OrdemProducao): void {
    this.search = ordem.numero || ordem.produto_referencia || '';
    this.showSugestoes = false;
    this.sugestoesOps = [];
    this.selectOrdem(ordem);
  }

  esconderSugestoes(): void {
    window.setTimeout(() => this.showSugestoes = false, 180);
  }

  nova(): void {
    this.ordemAtual = null;
    this.form = this.blankForm();
    this.estoqueValidacao = null;
    this.clearMsgs();
  }

  selectOrdem(ordem: OrdemProducao, clear = true): void {
    this.ordemAtual = ordem;
    this.form = { ...ordem };
    this.estoqueValidacao = null;
    this.montarDistribuicao(ordem);
    this.loadSkusDaFicha(Number(ordem.ficha_tecnica), false);
    if (clear) this.clearMsgs();
  }

  onFichaChange(): void {
    this.form.sku_final = null;
    this.form.quantidade = 0;
    this.gradeRows = [];
    this.loadSkusDaFicha(Number(this.form.ficha_tecnica), true);
  }

  salvar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.form.ficha_tecnica) {
      this.showError('Informe a ficha técnica aprovada.');
      return;
    }
    if (!this.form.quantidade || Number(this.form.quantidade) <= 0) {
      this.showError('Informe ao menos um SKU da grade com quantidade maior que zero.');
      return;
    }
    const gradeProducao = this.gradeRows
      .filter(row => Number(row.quantidade || 0) > 0)
      .map(row => ({ sku_final: row.skuId, quantidade: Number(row.quantidade || 0) }));
    if (!gradeProducao.length) {
      this.showError('Informe ao menos um SKU da grade com quantidade maior que zero.');
      return;
    }
    this.saving = true;
    const body: Partial<OrdemProducao> = {
      ficha_tecnica: Number(this.form.ficha_tecnica),
      quantidade: Number(this.form.quantidade || 0),
      grade_producao: gradeProducao as any,
      numero: this.form.numero || '',
      observacoes: this.form.observacoes || null,
    };
    const req = this.ordemAtual?.id ? this.api.update(this.ordemAtual.id, body) : this.api.create(body);
    req.subscribe({
      next: ordem => {
        this.showSuccess(this.ordemAtual?.id ? 'OP atualizada.' : 'OP criada.');
        this.ordemAtual = ordem;
        this.form = { ...ordem };
        this.aplicarGradeDaOrdem();
        this.load();
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível salvar a OP.')),
      complete: () => this.saving = false,
    });
  }

  aprovar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    this.executarAcao('aprovar', 'OP aprovada.');
  }

  iniciar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    this.executarAcao('iniciar', 'OP iniciada.');
  }

  finalizar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.ordemAtual?.id) return;
    const faccoesPendentes = this.itensFaccao().filter(item => item.status_faccao !== 'RETORNADO');
    if (faccoesPendentes.length) {
      this.showError(`Antes de finalizar, registre o retorno de ${faccoesPendentes.length} serviço(s) de facção desta OP.`);
      return;
    }
    this.verificarEstoque(() => this.executarAcao('finalizar', 'OP finalizada.'));
  }

  verificarEstoque(onOk?: () => void): void {
    if (!this.ordemAtual?.id) return;
    this.verificandoEstoque = true;
    this.api.validarEstoque(this.ordemAtual.id).subscribe({
      next: res => {
        this.estoqueValidacao = res;
        if (res.ok) {
          this.showSuccess(`Estoque suficiente em ${res.loja}.`);
          if (onOk) onOk();
          return;
        }
        const primeira = res.faltas?.[0];
        const complemento = primeira
          ? ` Primeiro item: ${primeira.produto}, necessário ${this.formatQtd(primeira.necessario)}, saldo ${this.formatQtd(primeira.saldo)}.`
          : '';
        this.showError(`Existem insumos sem saldo suficiente em ${res.loja}.${complemento}`);
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível verificar o estoque da OP.')),
      complete: () => this.verificandoEstoque = false,
    });
  }

  distribuir(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.ordemAtual?.id) return;
    if (!this.distribuicao.loja_destino) {
      this.showError('Informe a loja de destino da distribuição.');
      return;
    }
    const itens = this.distribuicaoRows
      .filter(row => Number(row.quantidade || 0) > 0)
      .map(row => ({ sku_final: row.skuFinal, quantidade: Number(row.quantidade || 0) }));
    if (!itens.length) {
      this.showError('Informe ao menos um SKU com quantidade maior que zero para distribuir.');
      return;
    }
    this.distribuindo = true;
    this.api.distribuir(this.ordemAtual.id, {
      loja_destino: Number(this.distribuicao.loja_destino),
      documento: this.distribuicao.documento || '',
      itens,
    }).subscribe({
      next: res => {
        this.showSuccess(`Distribuição registrada: ${res?.documento || ''}`.trim());
        this.showDistribuicaoModal = false;
        this.distribuicao.documento = '';
        this.distribuicaoRows.forEach(row => row.quantidade = 0);
        this.load();
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível registrar a distribuição.')),
      complete: () => this.distribuindo = false,
    });
  }

  abrirDistribuicao(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    this.showDistribuicaoModal = true;
  }

  fecharDistribuicao(): void {
    if (this.distribuindo) return;
    this.showDistribuicaoModal = false;
  }

  cancelar(): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    this.executarAcao('cancelar', 'OP cancelada.');
  }

  itensFaccao() {
    return (this.ordemAtual?.itens || []).filter(item => item.tipo === 'SERVICO');
  }

  statusFaccaoLabel(status?: string | null): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      ENVIADO: 'Enviado',
      RETORNADO: 'Retornado',
    };
    return labels[String(status || 'PENDENTE')] || 'Pendente';
  }

  enviarFaccao(item: any): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!item?.id) return;
    const quantidade = this.round2(item.quantidade_enviada_faccao || item.quantidade_necessaria || 0);
    this.api.enviarFaccao(item.id, {
      quantidade,
      documento: item.documento_faccao || '',
      data_envio: item.data_envio_faccao || undefined,
    }).subscribe({
      next: atualizado => {
        this.substituirItem(atualizado);
        this.showSuccess('Item enviado para facção.');
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível enviar para facção.')),
    });
  }

  retornarFaccao(item: any): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!item?.id) return;
    const quantidade = this.round2(item.quantidade_retornada_faccao || item.quantidade_enviada_faccao || item.quantidade_necessaria || 0);
    const custo = this.round2(item.custo_unitario_real || item.custo_unitario_previsto || 0);
    this.api.retornarFaccao(item.id, {
      quantidade,
      custo_unitario_real: custo,
      data_retorno: item.data_retorno_faccao || undefined,
    }).subscribe({
      next: atualizado => {
        this.substituirItem(atualizado);
        if (this.ordemAtual) {
          this.ordemAtual.custo_real = this.itensTotalReal();
        }
        this.showSuccess('Retorno da facção registrado.');
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível registrar retorno da facção.')),
    });
  }

  executarAcao(acao: 'aprovar' | 'iniciar' | 'finalizar' | 'cancelar', sucesso: string): void {
    if (!this.podeEditarModulo) {
      this.showError('Seu usuário tem acesso apenas para consulta em produção.');
      return;
    }
    if (!this.ordemAtual?.id) return;
    this.api[acao](this.ordemAtual.id).subscribe({
      next: ordem => {
        this.showSuccess(sucesso);
        this.selectOrdem(ordem, false);
        this.load();
      },
      error: err => this.showError(this.errorText(err, 'Não foi possível executar a ação.')),
    });
  }

  fichaLabel(id?: number | null): string {
    const ficha = this.fichas.find(f => f.id === Number(id));
    if (!ficha) return '';
    return `${ficha.produto_referencia || ficha.produto_final} - ${ficha.produto_descricao} v${ficha.versao}`;
  }

  skuLabel(sku?: ProdutoSku | null): string {
    if (!sku) return '';
    const cor = sku.cor_descricao || 'Cor';
    const tamanho = sku.tamanho_descricao || 'Tam.';
    return `${cor} / ${tamanho} - ${sku.ean13}`;
  }

  statusLabel(status?: OrdemProducaoStatus | string | null): string {
    const labels: Record<string, string> = {
      ABERTA: 'Aberta',
      APROVADA: 'Aprovada',
      EM_PRODUCAO: 'Em produção',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada',
    };
    return labels[String(status || '')] || '-';
  }

  canEdit(): boolean {
    return this.podeEditarModulo && (!this.ordemAtual?.id || this.ordemAtual.status === 'ABERTA');
  }

  recalcularTotalGrade(): void {
    this.form.quantidade = this.gradeRows.reduce((total, row) => total + Number(row.quantidade || 0), 0);
  }

  gradeResumo(ordem: OrdemProducao): string {
    const linhas = ordem.grade_producao || [];
    if (!linhas.length) {
      return ordem.sku_cor || ordem.sku_tamanho
        ? `${ordem.sku_cor || '-'} / ${ordem.sku_tamanho || '-'}`
        : '-';
    }
    const exibidas = linhas.slice(0, 3).map(l => `${l.sku_cor || '-'} ${l.sku_tamanho || '-'}: ${this.formatQtd(l.quantidade)}`);
    const restante = linhas.length > 3 ? ` +${linhas.length - 3}` : '';
    return `${exibidas.join(' | ')}${restante}`;
  }

  formatMoney(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatQtd(value: any): string {
    return Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private blankForm(): Partial<OrdemProducao> {
    return { ficha_tecnica: undefined as any, sku_final: null, quantidade: 0, numero: '', observacoes: null };
  }

  private loadSkusDaFicha(fichaId: number, clearOnEmpty: boolean): void {
    const ficha = this.fichas.find(f => f.id === fichaId);
    if (!ficha?.produto_final) {
      this.skusFinal = [];
      if (clearOnEmpty) this.form.sku_final = null;
      return;
    }
    this.skusApi.list({ produto: ficha.produto_final, page_size: 500 }).subscribe({
      next: res => {
        this.skusFinal = this.unwrap<ProdutoSku>(res).filter(s => s.ativo !== false);
        this.montarGradeRows(clearOnEmpty);
      },
      error: () => {
        this.skusFinal = [];
        this.gradeRows = [];
        if (clearOnEmpty) this.form.sku_final = null;
      },
    });
  }

  private montarGradeRows(clearOnEmpty: boolean): void {
    const quantidadesAtuais = new Map<number, number>();
    if (!clearOnEmpty) {
      (this.ordemAtual?.grade_producao || []).forEach(linha => {
        quantidadesAtuais.set(Number(linha.sku_final), Number(linha.quantidade || 0));
      });
    }

    this.gradeRows = this.skusFinal.map(sku => {
      const skuId = Number(sku.IdprodutoDetalhe || sku.id || 0);
      return {
        sku,
        skuId,
        quantidade: quantidadesAtuais.get(skuId) || 0,
      };
    }).filter(row => !!row.skuId);
    this.recalcularTotalGrade();
  }

  private aplicarGradeDaOrdem(): void {
    if (!this.skusFinal.length) return;
    this.montarGradeRows(false);
  }

  private substituirItem(itemAtualizado: any): void {
    if (!this.ordemAtual?.itens) return;
    this.ordemAtual.itens = this.ordemAtual.itens.map(item => item.id === itemAtualizado.id ? itemAtualizado : item);
  }

  private itensTotalReal(): number {
    return (this.ordemAtual?.itens || []).reduce((total, item) => total + Number(item.custo_total_real || 0), 0);
  }

  private round2(value: any): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private montarDistribuicao(ordem: OrdemProducao): void {
    this.distribuicaoRows = (ordem.grade_producao || []).map(linha => ({
      skuFinal: Number(linha.sku_final),
      cor: linha.sku_cor || '-',
      tamanho: linha.sku_tamanho || '-',
      ean: linha.sku_ean || '-',
      produzido: Number(linha.quantidade || 0),
      quantidade: 0,
    }));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results || []);
  }

  private clearMsgs(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    this.errorMsg = '';
  }

  private showError(msg: string): void {
    this.errorMsg = msg;
    this.successMsg = '';
  }

  private errorText(err: any, fallback: string): string {
    if (typeof err?.error === 'string') {
      if (err.error.trim().startsWith('<')) return 'Erro interno do servidor. Verifique o backend e tente novamente.';
      return err.error;
    }
    const detail = err?.error?.detail;
    if (detail) return String(detail);
    const labels: Record<string, string> = {
      ficha_tecnica: 'Ficha técnica',
      sku_final: 'SKU produzido',
      quantidade: 'Quantidade',
      numero: 'Número',
      status: 'Status',
    };
    const firstEntry = err?.error && Object.entries(err.error)[0] as [string, any] | undefined;
    if (firstEntry) {
      const [field, value] = firstEntry;
      const msg = Array.isArray(value) ? value[0] : value;
      return `${labels[field] || field}: ${msg}`;
    }
    return fallback;
  }
}
