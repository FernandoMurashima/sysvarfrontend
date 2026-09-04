import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PedidoRecebimentoMercadoria, RecebimentoMercadoria, RecebimentoMercadoriaConferenciaItem } from '../../core/models/recebimento-mercadoria';
import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';

type UltimaLeituraConferencia = {
  status: 'ok' | 'falta' | 'sobra' | 'erro';
  ean: string;
  mensagem?: string;
  referencia?: string;
  produto?: string;
  cor?: string;
  tamanho?: string;
  recebido?: number;
  esperado?: number;
  situacao?: string;
};

@Component({
  selector: 'app-recebimento-mercadoria-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './recebimento-mercadoria-detalhe.component.html',
  styleUrls: ['./recebimento-mercadoria-detalhe.component.css'],
})
export class RecebimentoMercadoriaDetalheComponent implements OnInit, OnDestroy {
  private api = inject(RecebimentoMercadoriaService);
  private route = inject(ActivatedRoute);
  @ViewChild('eanInput') eanInput?: ElementRef<HTMLInputElement>;

  recebimento: RecebimentoMercadoria | null = null;
  pedidosElegiveis: PedidoRecebimentoMercadoria[] = [];
  selecionados = new Set<number>();
  modalPedidosAberto = false;
  modalConferenciaAberto = false;
  loading = false;
  loadingPedidos = false;
  saving = false;
  gerandoConferencia = false;
  salvandoConferencia = false;
  errorMsg = '';
  eanBipagem = '';
  ultimaLeitura: UltimaLeituraConferencia | null = null;
  conferenciaItemDestacadoId: number | null = null;
  alteracoesPendentes = 0;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveEmAndamento = false;
  private saveAposAtual = false;
  private fecharAposSalvar = false;

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    this.cancelarAutosave();
  }

  carregar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.errorMsg = '';
    this.api.get(id).pipe(finalize(() => this.loading = false)).subscribe({
      next: recebimento => {
        this.recebimento = recebimento;
        this.selecionados = new Set((recebimento.pedidos || []).map(p => p.id));
      },
      error: () => this.errorMsg = 'Não foi possível carregar o recebimento.',
    });
  }

  abrirPedidos(): void {
    if (!this.recebimento) return;
    this.modalPedidosAberto = true;
    this.loadingPedidos = true;
    this.errorMsg = '';
    this.api.pedidosElegiveis(this.recebimento.id).pipe(finalize(() => this.loadingPedidos = false)).subscribe({
      next: pedidos => this.pedidosElegiveis = pedidos,
      error: () => this.errorMsg = 'Não foi possível carregar os pedidos elegíveis.',
    });
  }

  fecharPedidos(): void {
    this.modalPedidosAberto = false;
  }

  togglePedido(pedido: PedidoRecebimentoMercadoria, checked: boolean): void {
    if (checked) this.selecionados.add(pedido.id);
    else this.selecionados.delete(pedido.id);
  }

  salvarPedidos(): void {
    if (!this.recebimento) return;
    this.saving = true;
    this.errorMsg = '';
    this.api.vincularPedidos(this.recebimento.id, Array.from(this.selecionados)).pipe(finalize(() => this.saving = false)).subscribe({
      next: recebimento => {
        this.recebimento = recebimento;
        this.modalPedidosAberto = false;
      },
      error: () => this.errorMsg = 'Não foi possível salvar os pedidos vinculados.',
    });
  }

  gerarConferencia(): void {
    if (!this.recebimento) return;
    this.gerandoConferencia = true;
    this.errorMsg = '';
    this.api.gerarConferencia(this.recebimento.id).pipe(finalize(() => this.gerandoConferencia = false)).subscribe({
      next: recebimento => this.recebimento = recebimento,
      error: () => this.errorMsg = 'Não foi possível gerar a conferência física.',
    });
  }

  salvarConferencia(): void {
    this.salvarConferenciaAtual({ manual: true });
  }

  abrirConferencia(): void {
    if (!this.conferenciaGerada()) return;
    this.modalConferenciaAberto = true;
    this.focarBipagem();
  }

  fecharConferencia(): void {
    if (this.alteracoesPendentes > 0) {
      this.fecharAposSalvar = true;
      this.salvarConferenciaAtual({ manual: true, erro: 'Não foi possível salvar automaticamente a conferência.' });
      return;
    }
    this.modalConferenciaAberto = false;
  }

  processarBipagem(): void {
    const ean = this.eanBipagem.trim();
    if (!ean || !this.recebimento) {
      this.eanBipagem = '';
      this.focarBipagem();
      return;
    }

    const encontrados = (this.recebimento.conferencia_itens || []).filter(item => String(item.ean || '').trim() === ean);
    this.eanBipagem = '';

    if (encontrados.length === 0) {
      this.ultimaLeitura = { status: 'erro', ean, mensagem: 'EAN não pertence a este recebimento.' };
      this.focarBipagem();
      return;
    }

    if (encontrados.length > 1) {
      this.ultimaLeitura = { status: 'erro', ean, mensagem: 'EAN duplicado/ambíguo na conferência.' };
      this.focarBipagem();
      return;
    }

    const item = encontrados[0];
    item.quantidade_recebida = String(Number(item.quantidade_recebida || 0) + 1);
    this.atualizarResumoLocal();
    this.registrarAlteracaoPendente();
    this.registrarUltimaLeitura(ean, item);
    this.destacarLinha(item.id);
    this.focarBipagem();
  }

  registrarEdicaoManual(): void {
    this.atualizarResumoLocal();
    this.registrarAlteracaoPendente();
  }

  diferenca(item: RecebimentoMercadoriaConferenciaItem): number {
    return Number(item.quantidade_recebida || 0) - Number(item.quantidade_esperada || 0);
  }

  situacaoDiferenca(item: RecebimentoMercadoriaConferenciaItem): string {
    const dif = this.diferenca(item);
    if (dif === 0) return 'OK';
    return dif > 0 ? 'Sobra' : 'Falta';
  }

  conferenciaGerada(): boolean {
    return !!this.recebimento?.conferencia_itens?.length;
  }

  valorResumo(campo: keyof RecebimentoMercadoria['conferencia_resumo']): string {
    const valor = this.recebimento?.conferencia_resumo?.[campo];
    return valor === null || valor === undefined || valor === '' ? '-' : String(valor);
  }

  nfe(): string {
    const xml = this.recebimento?.xml_fornecedor_dados;
    return xml ? `${xml.numero || '-'} / ${xml.serie || '-'}` : '-';
  }

  lojaNome(): string {
    return this.recebimento?.loja_nome || 'Estabelecimento não identificado';
  }

  fornecedorNome(): string {
    return this.recebimento?.fornecedor_nome || 'Fornecedor não identificado';
  }

  trackById(_: number, row: PedidoRecebimentoMercadoria): number {
    return row.id;
  }

  trackConferenciaById(_: number, row: RecebimentoMercadoriaConferenciaItem): number {
    return row.id;
  }

  private registrarAlteracaoPendente(): void {
    this.alteracoesPendentes += 1;
    if (this.alteracoesPendentes >= 20) {
      this.salvarConferenciaAtual({ erro: 'Não foi possível salvar automaticamente a conferência.' });
      return;
    }
    this.agendarAutosave();
  }

  private agendarAutosave(): void {
    this.cancelarAutosave();
    this.autosaveTimer = setTimeout(() => {
      this.salvarConferenciaAtual({ erro: 'Não foi possível salvar automaticamente a conferência.' });
    }, 700);
  }

  private cancelarAutosave(): void {
    if (!this.autosaveTimer) return;
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
  }

  private salvarConferenciaAtual(options: { manual?: boolean; erro?: string } = {}): void {
    if (!this.recebimento) return;
    this.cancelarAutosave();
    if (this.saveEmAndamento) {
      this.saveAposAtual = true;
      return;
    }

    const recebimentoId = this.recebimento.id;
    const pendenciasSalvas = this.alteracoesPendentes;
    const itens = (this.recebimento.conferencia_itens || []).map(item => ({
      id: item.id,
      quantidade_recebida: item.quantidade_recebida || 0,
    }));

    this.saveEmAndamento = true;
    this.salvandoConferencia = true;
    this.errorMsg = '';
    this.api.salvarConferencia(recebimentoId, itens).pipe(finalize(() => {
      this.saveEmAndamento = false;
      this.salvandoConferencia = false;
      this.focarBipagem();
    })).subscribe({
      next: recebimento => {
        if (this.alteracoesPendentes === pendenciasSalvas) {
          this.recebimento = recebimento;
          this.alteracoesPendentes = 0;
          if (this.fecharAposSalvar) {
            this.modalConferenciaAberto = false;
            this.fecharAposSalvar = false;
          }
        }
        if (!this.saveAposAtual && this.alteracoesPendentes <= pendenciasSalvas) return;
        this.saveAposAtual = false;
        setTimeout(() => this.salvarConferenciaAtual({ erro: options.erro }));
      },
      error: () => {
        this.errorMsg = options.erro || 'Não foi possível salvar a conferência física.';
        this.fecharAposSalvar = false;
      },
    });
  }

  private registrarUltimaLeitura(ean: string, item: RecebimentoMercadoriaConferenciaItem): void {
    const dif = this.diferenca(item);
    const situacao = this.situacaoDiferenca(item);
    this.ultimaLeitura = {
      status: dif === 0 ? 'ok' : dif > 0 ? 'sobra' : 'falta',
      ean,
      referencia: item.produto_referencia || '-',
      produto: item.produto_descricao,
      cor: item.cor_nome,
      tamanho: item.tamanho_nome,
      recebido: Number(item.quantidade_recebida || 0),
      esperado: Number(item.quantidade_esperada || 0),
      situacao,
    };
  }

  private destacarLinha(id: number): void {
    this.conferenciaItemDestacadoId = id;
    setTimeout(() => {
      document.querySelector(`[data-conferencia-item-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.focarBipagem();
    });
    setTimeout(() => {
      if (this.conferenciaItemDestacadoId === id) this.conferenciaItemDestacadoId = null;
    }, 1500);
  }

  private focarBipagem(): void {
    setTimeout(() => this.eanInput?.nativeElement.focus());
  }

  private atualizarResumoLocal(): void {
    if (!this.recebimento?.conferencia_resumo) return;
    const resumo = this.recebimento.conferencia_resumo;
    const itens = this.recebimento.conferencia_itens || [];
    const fisico = itens.reduce((total, item) => total + Number(item.quantidade_recebida || 0), 0);
    const pedido = Number(resumo.quantidade_pedido_total || resumo.quantidade_esperada_total || 0);
    const nfeDisponivel = resumo.quantidade_nfe_total !== null && resumo.quantidade_nfe_total !== undefined && resumo.quantidade_nfe_total !== '';
    const nfe = Number(resumo.quantidade_nfe_total || 0);

    resumo.quantidade_fisica_total = this.formatarQuantidade(fisico) as any;
    resumo.diferenca_fisico_pedido = this.formatarQuantidade(fisico - pedido) as any;
    if (nfeDisponivel) resumo.diferenca_fisico_nfe = this.formatarQuantidade(fisico - nfe) as any;
    resumo.quantidade_skus_com_divergencia = itens.filter(item => this.diferenca(item) !== 0).length;
  }

  private formatarQuantidade(valor: number): string {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(3);
  }
}
