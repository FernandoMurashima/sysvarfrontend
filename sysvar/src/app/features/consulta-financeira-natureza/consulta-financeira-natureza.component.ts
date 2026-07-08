import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ConsultaFinanceiraNatureza,
  ConsultaNaturezaCategoria,
  ConsultaNaturezaDetalhe,
  ConsultaNaturezaLinha,
} from '../../core/models/consulta-financeira-natureza';
import { Loja } from '../../core/models/loja';
import { NatLancamento } from '../../core/models/natureza-lancamento';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';

type AbaConsulta = 'natureza' | 'categoria' | 'detalhe';

@Component({
  selector: 'app-consulta-financeira-natureza',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './consulta-financeira-natureza.component.html',
  styleUrls: ['./consulta-financeira-natureza.component.css'],
})
export class ConsultaFinanceiraNaturezaComponent implements OnInit {
  private api = inject(MovimentacoesFinanceirasService);
  private lojasApi = inject(LojasService);
  private naturezasApi = inject(NatLancamentosService);

  loading = false;
  errorMsg = '';
  aba: AbaConsulta = 'natureza';

  lojas: Loja[] = [];
  naturezas: NatLancamento[] = [];
  consulta: ConsultaFinanceiraNatureza | null = null;

  filtros = {
    data_ini: '',
    data_fim: '',
    loja: '',
    operacao: '',
    natureza: '',
    status: 'EFETIVA',
  };

  ngOnInit(): void {
    this.definirPeriodoPadrao();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      naturezas: this.naturezasApi.list({ page_size: 500, ordering: 'codigo' }),
    }).subscribe({
      next: ({ lojas, naturezas }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.naturezas = this.unwrap<NatLancamento>(naturezas).filter(n => n.ativo !== false);
        this.consultar();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractError(err);
      },
    });
  }

  consultar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.consultaNaturezas(this.filtros).subscribe({
      next: res => {
        this.consulta = res;
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.extractError(err);
        this.loading = false;
      },
    });
  }

  limpar(): void {
    this.filtros.loja = '';
    this.filtros.operacao = '';
    this.filtros.natureza = '';
    this.filtros.status = 'EFETIVA';
    this.definirPeriodoPadrao();
    this.consultar();
  }

  alternarTelaCheia(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  get linhasNatureza(): ConsultaNaturezaLinha[] {
    return this.consulta?.por_natureza ?? [];
  }

  get linhasCategoria(): ConsultaNaturezaCategoria[] {
    return this.consulta?.por_categoria ?? [];
  }

  get detalhes(): ConsultaNaturezaDetalhe[] {
    return this.consulta?.detalhes ?? [];
  }

  get naturezasFiltradas(): NatLancamento[] {
    const operacao = this.filtros.operacao;
    if (!operacao) return this.naturezas;
    return this.naturezas.filter(n => String(n.natureza_operacao || '').toUpperCase() === operacao);
  }

  onOperacaoChange(): void {
    if (this.filtros.natureza && !this.naturezasFiltradas.some(n => String(n.idnatureza) === String(this.filtros.natureza))) {
      this.filtros.natureza = '';
    }
  }

  money(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  valorClass(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    if (n > 0) return 'valor-pos';
    if (n < 0) return 'valor-neg';
    return '';
  }

  lojaId(loja: Loja): number | null {
    return loja.Idloja ?? loja.id ?? null;
  }

  private definirPeriodoPadrao(): void {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.filtros.data_ini = this.toInputDate(primeiroDia);
    this.filtros.data_fim = this.toInputDate(hoje);
  }

  private toInputDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private unwrap<T>(resp: unknown): T[] {
    if (Array.isArray(resp)) return resp as T[];
    const obj = resp as { results?: T[] };
    return Array.isArray(obj?.results) ? obj.results : [];
  }

  private extractError(err: unknown): string {
    const detail = (err as { error?: { detail?: string } })?.error?.detail;
    return detail || 'Nao foi possivel carregar a consulta.';
  }
}
