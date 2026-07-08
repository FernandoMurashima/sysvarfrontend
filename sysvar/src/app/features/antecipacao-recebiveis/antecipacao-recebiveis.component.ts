import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AntecipacaoRecebivel, RecebivelAntecipacao } from '../../core/models/antecipacao-recebivel';
import { ContaBancaria } from '../../core/models/conta-bancaria';
import { FormaPagamento } from '../../core/models/forma-pagamento';
import { Loja } from '../../core/models/loja';
import { AntecipacoesRecebiveisService } from '../../core/services/antecipacoes-recebiveis.service';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-antecipacao-recebiveis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './antecipacao-recebiveis.component.html',
  styleUrls: ['./antecipacao-recebiveis.component.css']
})
export class AntecipacaoRecebiveisComponent implements OnInit {
  private api = inject(AntecipacoesRecebiveisService);
  private lojasApi = inject(LojasService);
  private contasApi = inject(ContasBancariasService);
  private formasApi = inject(FormasPagamentoService);

  lojas: Loja[] = [];
  contas: ContaBancaria[] = [];
  formas: FormaPagamento[] = [];
  recebiveis: RecebivelAntecipacao[] = [];
  antecipacoes: AntecipacaoRecebivel[] = [];
  selecionados: Record<number, boolean> = {};

  lojaFiltro: number | null = null;
  contaFiltro: number | null = null;
  formaFiltro = '';
  vencInicio = '';
  vencFim = '';
  dataAntecipacao = this.today();
  documento = '';
  taxaPercentual = 1.5;
  observacao = '';

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.loadInicial();
  }

  loadInicial(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      contas: this.contasApi.list({ ativo: true }),
      formas: this.formasApi.list({ ativo: true }),
      antecipacoes: this.api.list({ page_size: 100 })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.contas = this.unwrap<ContaBancaria>(res.contas);
        this.formas = this.unwrap<FormaPagamento>(res.formas).filter(f => !!f.gera_recebivel_bancario);
        this.antecipacoes = this.unwrap<AntecipacaoRecebivel>(res.antecipacoes);
        this.formaFiltro = this.formas[0]?.codigo || '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar dados de antecipação.';
      }
    });
  }

  buscarRecebiveis(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;
    this.api.recebiveis({
      loja: this.lojaFiltro,
      conta_bancaria: this.contaFiltro,
      forma_pagamento: this.formaFiltro,
      data_ini: this.vencInicio,
      data_fim: this.vencFim
    }).subscribe({
      next: res => {
        this.recebiveis = res;
        this.selecionados = {};
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao buscar recebíveis.';
      }
    });
  }

  executar(): void {
    const ids = this.idsSelecionados();
    if (!ids.length) {
      this.errorMsg = 'Selecione ao menos um recebível para antecipar.';
      return;
    }
    if (!this.dataAntecipacao) {
      this.errorMsg = 'Informe a data da antecipação.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.executar({
      movimentacoes: ids,
      data_antecipacao: this.dataAntecipacao,
      taxa_percentual: Number(this.taxaPercentual || 0),
      documento: this.documento.trim() || null,
      observacao: this.observacao.trim() || null
    }).subscribe({
      next: res => {
        this.saving = false;
        this.successMsg = `Antecipação registrada: ${res.documento}`;
        this.documento = '';
        this.observacao = '';
        this.buscarRecebiveis();
        this.loadAntecipacoes();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = err?.error?.detail || 'Falha ao registrar antecipação.';
      }
    });
  }

  loadAntecipacoes(): void {
    this.api.list({ page_size: 100 }).subscribe({
      next: res => this.antecipacoes = this.unwrap<AntecipacaoRecebivel>(res)
    });
  }

  marcarTodos(): void {
    const selected: Record<number, boolean> = {};
    this.recebiveis.forEach(item => {
      if (item.Idmovimentacao) selected[item.Idmovimentacao] = true;
    });
    this.selecionados = selected;
  }

  limparSelecao(): void {
    this.selecionados = {};
  }

  alternar(item: RecebivelAntecipacao, checked: boolean): void {
    if (!item.Idmovimentacao) return;
    this.selecionados[item.Idmovimentacao] = checked;
  }

  selecionado(item: RecebivelAntecipacao): boolean {
    return !!item.Idmovimentacao && !!this.selecionados[item.Idmovimentacao];
  }

  totalBruto(): number {
    return this.recebiveis
      .filter(item => this.selecionado(item))
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  taxaValor(): number {
    return this.totalBruto() * Number(this.taxaPercentual || 0) / 100;
  }

  totalLiquido(): number {
    return this.totalBruto() - this.taxaValor();
  }

  qtdSelecionada(): number {
    return this.idsSelecionados().length;
  }

  lojaNome(id: number): string {
    return this.lojas.find(loja => loja.id === id)?.nome_loja || `Loja #${id}`;
  }

  contaNome(id?: number | null): string {
    const conta = this.contas.find(item => item.Idconta === id);
    return conta ? `${conta.descricao} - ${conta.banco}` : '-';
  }

  private idsSelecionados(): number[] {
    return Object.entries(this.selecionados)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter(id => Number.isFinite(id));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
