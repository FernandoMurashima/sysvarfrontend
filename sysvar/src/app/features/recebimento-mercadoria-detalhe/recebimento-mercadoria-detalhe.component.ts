import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PedidoRecebimentoMercadoria, RecebimentoMercadoria, RecebimentoMercadoriaConferenciaItem } from '../../core/models/recebimento-mercadoria';
import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';

@Component({
  selector: 'app-recebimento-mercadoria-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './recebimento-mercadoria-detalhe.component.html',
  styleUrls: ['./recebimento-mercadoria-detalhe.component.css'],
})
export class RecebimentoMercadoriaDetalheComponent implements OnInit {
  private api = inject(RecebimentoMercadoriaService);
  private route = inject(ActivatedRoute);

  recebimento: RecebimentoMercadoria | null = null;
  pedidosElegiveis: PedidoRecebimentoMercadoria[] = [];
  selecionados = new Set<number>();
  modalPedidosAberto = false;
  loading = false;
  loadingPedidos = false;
  saving = false;
  gerandoConferencia = false;
  salvandoConferencia = false;
  errorMsg = '';

  ngOnInit(): void {
    this.carregar();
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
    if (!this.recebimento) return;
    const itens = (this.recebimento.conferencia_itens || []).map(item => ({
      id: item.id,
      quantidade_recebida: item.quantidade_recebida || 0,
    }));
    this.salvandoConferencia = true;
    this.errorMsg = '';
    this.api.salvarConferencia(this.recebimento.id, itens).pipe(finalize(() => this.salvandoConferencia = false)).subscribe({
      next: recebimento => this.recebimento = recebimento,
      error: () => this.errorMsg = 'Não foi possível salvar a conferência física.',
    });
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
}
