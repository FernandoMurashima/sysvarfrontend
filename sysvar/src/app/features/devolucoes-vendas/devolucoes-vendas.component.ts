import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Cliente } from '../../core/models/clientes';
import { Loja } from '../../core/models/loja';
import { ValeTroca } from '../../core/models/vale-troca';
import { VendaDevolucao, VendaDevolucaoConsulta, VendaDevolucaoItemConsulta } from '../../core/models/venda-pdv';
import { ClientesService } from '../../core/services/clientes.service';
import { LojasService } from '../../core/services/lojas.service';
import { ValeTrocaService } from '../../core/services/vale-troca.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { PdvConnectivityService } from '../../core/connectivity/pdv-connectivity.service';
import { PdvOfflineDevolucaoQueueService } from '../../core/services/pdv-offline-devolucao-queue.service';

@Component({
  selector: 'app-devolucoes-vendas',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSuggestComponent, PageHeaderComponent, SummaryCardComponent],
  templateUrl: './devolucoes-vendas.component.html',
  styleUrls: ['./devolucoes-vendas.component.css']
})
export class DevolucoesVendasComponent implements OnInit {
  private vendasApi = inject(VendaPdvService);
  private lojasApi = inject(LojasService);
  private clientesApi = inject(ClientesService);
  private valeTrocaApi = inject(ValeTrocaService);
  private connectivity = inject(PdvConnectivityService);
  private devolucoesOffline = inject(PdvOfflineDevolucaoQueueService);
  private router = inject(Router);

  documento = '';
  codigoBarra = '';
  eanSelecionado = '';
  lojaId: number | null = null;
  clienteId: number | null = null;
  motivo = '';
  lojas: Loja[] = [];
  clientes: Cliente[] = [];
  vendas: VendaDevolucaoConsulta[] = [];
  venda: VendaDevolucaoConsulta | null = null;
  devolucao: VendaDevolucao | null = null;
  cupomTrocaBusca = '';
  valesTroca: ValeTroca[] = [];
  valeTrocaSelecionado: ValeTroca | null = null;
  quantidades: Record<number, number> = {};
  loading = false;
  loadingBase = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  pendentesOffline = 0;

  get documentoSuggestions(): string[] {
    const valores = this.vendas.flatMap(venda => [
      venda.documento,
      venda.cliente_nome
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get eanSuggestions(): string[] {
    const valores = this.vendas.flatMap(venda =>
      venda.itens.flatMap(item => [item.ean, item.descricao])
    ).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get cupomTrocaSuggestions(): string[] {
    const valores = this.valesTroca.flatMap(vale => [
      vale.documento,
      vale.cliente_nome,
      vale.venda_origem_documento,
      vale.devolucao_documento
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  get totalItensDisponiveis(): number {
    return this.vendas.reduce((total, venda) => total + this.saldoDisponivelVenda(venda), 0);
  }

  get totalClientesComVenda(): number {
    const clientes = this.vendas.map(venda => venda.cliente_nome).filter(Boolean);
    return new Set(clientes).size;
  }

  get valorVendasDisponiveis(): number {
    return this.vendas.reduce((total, venda) => total + Number(venda.total || 0), 0);
  }

  get creditoSelecionado(): number {
    return this.totalSelecionado();
  }

  get creditoSelecionadoFormatado(): string {
    return this.moeda(this.creditoSelecionado);
  }

  ngOnInit(): void {
    this.atualizarPendentesOffline();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loadingBase = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 1000 }),
      clientes: this.clientesApi.list({ ativo: 'true', page_size: 1000 })
    }).subscribe({
      next: data => {
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.clientes = this.unwrap<Cliente>(data.clientes).filter(c => c.ativo !== false);
        this.loadingBase = false;
        this.filtrarVendas();
      },
      error: () => {
        this.loadingBase = false;
        this.errorMsg = 'Falha ao carregar filtros.';
        this.filtrarVendas();
      }
    });
  }

  filtrarVendas(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.vendasApi.vendasDevolviveis({
      loja: this.lojaId,
      cliente: this.clienteId,
      documento: this.documento.trim()
    }).subscribe({
      next: vendas => {
        this.vendas = vendas;
        this.loading = false;
      },
      error: err => {
        this.vendas = [];
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao consultar vendas.';
      }
    });
  }

  buscar(): void {
    const documento = this.documento.trim();
    if (!documento) {
      this.errorMsg = 'Informe o documento da venda.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.devolucao = null;
    this.vendasApi.buscarVendaParaDevolucao(documento).subscribe({
      next: venda => {
        this.venda = venda;
        this.quantidades = {};
        venda.itens.forEach(item => {
          this.quantidades[item.id] = item.quantidade_disponivel > 0 ? 1 : 0;
        });
        this.loading = false;
      },
      error: err => {
        this.venda = null;
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Venda não encontrada.';
      }
    });
  }

  consultarCuponsTroca(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.valeTrocaSelecionado = null;
    this.valeTrocaApi.list({
      loja: this.lojaId,
      cliente: this.clienteId,
      documento: this.cupomTrocaBusca.trim(),
      status: 'ABERTO'
    }).subscribe({
      next: resp => {
        this.valesTroca = this.unwrap<ValeTroca>(resp);
        this.valeTrocaSelecionado = this.valesTroca[0] ?? null;
        this.loading = false;
      },
      error: err => {
        this.valesTroca = [];
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao consultar cupons de troca.';
      }
    });
  }

  selecionarValeTroca(vale: ValeTroca): void {
    this.valeTrocaSelecionado = vale;
  }

  buscarPorCodigoBarra(): void {
    const ean = this.codigoBarra.trim();
    if (!this.clienteId) {
      this.errorMsg = 'Informe o cliente antes de consultar pelo código de barras.';
      return;
    }
    if (!ean) {
      this.errorMsg = 'Informe ou bipe o código de barras.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.devolucao = null;
    this.eanSelecionado = ean;
    this.vendasApi.vendasDevolviveis({
      loja: this.lojaId,
      cliente: this.clienteId,
      ean
    }).subscribe({
      next: vendas => {
        this.vendas = vendas;
        this.loading = false;
        if (!vendas.length) {
          this.venda = null;
          this.quantidades = {};
          this.errorMsg = 'Referência não consta para o cliente.';
          return;
        }
        this.carregarVenda(vendas[0], ean);
      },
      error: () => {
        this.vendas = [];
        this.venda = null;
        this.quantidades = {};
        this.loading = false;
        this.errorMsg = 'Referência não consta para o cliente.';
      }
    });
  }

  carregarVenda(venda: VendaDevolucaoConsulta, eanSelecionado = ''): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.devolucao = null;
    this.eanSelecionado = eanSelecionado;
    this.vendasApi.buscarVendaParaDevolucao(venda.documento, venda.id).subscribe({
      next: vendaAtualizada => {
        this.prepararVenda(vendaAtualizada, eanSelecionado);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao carregar venda.';
      }
    });
  }

  finalizar(): void {
    if (!this.venda) return;
    const itens = this.venda.itens
      .map(item => ({ venda_item: item.id, quantidade: Math.trunc(Number(this.quantidades[item.id] || 0)) }))
      .filter(item => item.quantidade > 0);
    if (!itens.length) {
      this.errorMsg = 'Informe a quantidade de ao menos um item.';
      return;
    }
    const invalido = itens.some(row => {
      const item = this.venda?.itens.find(i => i.id === row.venda_item);
      return !item || row.quantidade > item.quantidade_disponivel;
    });
    if (invalido) {
      this.errorMsg = 'Existe item com quantidade maior que o saldo disponível para devolução.';
      return;
    }

    const payload = {
      venda: this.venda.id,
      motivo: this.motivo,
      itens
    };

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    if (this.connectivity.snapshot().online === false) {
      const pendente = this.devolucoesOffline.adicionar(payload);
      this.saving = false;
      this.successMsg = `Devolução offline gravada: ${pendente.documento}`;
      this.devolucao = null;
      this.venda = null;
      this.quantidades = {};
      this.atualizarPendentesOffline();
      return;
    }

    this.vendasApi.finalizarDevolucao(payload).subscribe({
      next: devolucao => {
        this.devolucao = devolucao;
        this.prepararVenda(devolucao.venda_origem ?? this.venda);
        this.filtrarVendas();
        this.saving = false;
        this.successMsg = `Devolução ${devolucao.documento} finalizada.`;
        this.atualizarPendentesOffline();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = err?.error?.detail || 'Falha ao finalizar devolução.';
      }
    });
  }

  sincronizarPendentes(): void {
    if (!this.pendentesOffline || this.saving) return;
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.devolucoesOffline.sincronizar().then(resumo => {
      this.saving = false;
      this.atualizarPendentesOffline();
      if (resumo.erros) {
        this.errorMsg = resumo.erro || 'Falha ao sincronizar devoluções.';
        return;
      }
      this.successMsg = `${resumo.enviados} devolução(ões) sincronizada(s).`;
      this.filtrarVendas();
    }).catch(error => {
      this.saving = false;
      this.atualizarPendentesOffline();
      this.errorMsg = error?.message || 'Falha ao sincronizar devoluções.';
    });
  }

  limpar(): void {
    this.documento = '';
    this.cupomTrocaBusca = '';
    this.valesTroca = [];
    this.valeTrocaSelecionado = null;
    this.codigoBarra = '';
    this.eanSelecionado = '';
    this.lojaId = null;
    this.clienteId = null;
    this.motivo = '';
    this.cancelar();
    this.filtrarVendas();
  }

  cancelar(): void {
    this.venda = null;
    this.devolucao = null;
    this.quantidades = {};
    this.motivo = '';
    this.eanSelecionado = '';
    this.errorMsg = '';
    this.successMsg = '';
  }

  totalSelecionado(): number {
    if (!this.venda) return 0;
    return this.venda.itens.reduce((total, item) => total + this.totalItemSelecionado(item), 0);
  }

  totalItemSelecionado(item: VendaDevolucaoItemConsulta): number {
    const quantidade = Math.max(0, Math.trunc(Number(this.quantidades[item.id] || 0)));
    if (!quantidade) return 0;
    const valorUnitarioLiquido = Number(item.total_item || 0) / Math.max(1, Number(item.quantidade || 1));
    return quantidade * valorUnitarioLiquido;
  }

  itemDisponivel(item: VendaDevolucaoItemConsulta): boolean {
    return Number(item.quantidade_disponivel || 0) > 0;
  }

  moeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  irHome(): void {
    this.router.navigate(['/home']);
  }

  saldoDisponivelVenda(venda: VendaDevolucaoConsulta): number {
    return venda.itens.reduce((total, item) => total + Number(item.quantidade_disponivel || 0), 0);
  }

  private prepararVenda(venda: VendaDevolucaoConsulta | null, eanSelecionado = ''): void {
    this.venda = venda;
    this.quantidades = {};
    venda?.itens.forEach(item => {
      const itemEanSelecionado = !eanSelecionado || item.ean === eanSelecionado;
      this.quantidades[item.id] = item.quantidade_disponivel > 0 && itemEanSelecionado ? 1 : 0;
    });
  }

  private unwrap<T>(resp: T[] | { results: T[] }): T[] {
    return Array.isArray(resp) ? resp : resp.results || [];
  }

  private atualizarPendentesOffline(): void {
    this.pendentesOffline = this.devolucoesOffline.quantidade();
  }
}
