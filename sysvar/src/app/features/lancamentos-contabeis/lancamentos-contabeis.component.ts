import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { LancamentoContabil, LancamentoContabilListResp, StatusLancamentoContabil } from '../../core/models/lancamento-contabil';
import { Loja } from '../../core/models/loja';
import { LancamentosContabeisService } from '../../core/services/lancamentos-contabeis.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-lancamentos-contabeis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lancamentos-contabeis.component.html',
  styleUrls: ['./lancamentos-contabeis.component.css'],
})
export class LancamentosContabeisComponent implements OnInit {
  private api = inject(LancamentosContabeisService);
  private lojasApi = inject(LojasService);

  loading = false;
  errorMsg = '';
  lojas: Loja[] = [];
  lancamentos: LancamentoContabil[] = [];
  totalRegistrosApi = 0;

  filtros = {
    loja: '',
    status: '',
    origem: '',
    data_ini: '',
    data_fim: '',
  };

  ngOnInit(): void {
    this.definirPeriodoPadrao();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 5000 }),
      lancamentos: this.api.list(this.queryParams()),
    }).subscribe({
      next: ({ lojas, lancamentos }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.aplicarLista(lancamentos);
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.extractError(err);
        this.loading = false;
      },
    });
  }

  consultar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.list(this.queryParams()).subscribe({
      next: res => {
        this.aplicarLista(res);
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
    this.filtros.status = '';
    this.filtros.origem = '';
    this.definirPeriodoPadrao();
    this.consultar();
  }

  verPendentes(): void {
    this.filtros.status = 'PENDENTE';
    this.consultar();
  }

  alternarTelaCheia(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  lojaId(loja: Loja): number | null {
    return loja.Idloja ?? loja.id ?? null;
  }

  money(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  statusClass(status: StatusLancamentoContabil | string): string {
    const value = String(status || '').toUpperCase();
    if (value === 'GERADO') return 'badge ok';
    if (value === 'PENDENTE') return 'badge warn';
    if (value === 'ESTORNADO') return 'badge off';
    return 'badge';
  }

  contaLabel(codigo?: string | null, descricao?: string | null): string {
    if (!codigo && !descricao) return '-';
    if (!codigo) return descricao || '-';
    if (!descricao) return codigo;
    return `${codigo} - ${descricao}`;
  }

  get totalValor(): number {
    return this.lancamentos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get totalGerados(): number {
    return this.lancamentos.filter(item => item.status === 'GERADO').length;
  }

  get totalPendentes(): number {
    return this.lancamentos.filter(item => item.status === 'PENDENTE').length;
  }

  get totalEstornados(): number {
    return this.lancamentos.filter(item => item.status === 'ESTORNADO').length;
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

  private aplicarLista(resp: LancamentoContabilListResp): void {
    this.lancamentos = this.unwrap<LancamentoContabil>(resp);
    this.totalRegistrosApi = Array.isArray(resp) ? resp.length : Number(resp.count || this.lancamentos.length);
  }

  private queryParams(): Record<string, string | number> {
    return {
      ...this.filtros,
      page_size: 5000,
    };
  }

  private extractError(err: unknown): string {
    const detail = (err as { error?: { detail?: string } })?.error?.detail;
    return detail || 'Nao foi possivel carregar os lancamentos contabeis.';
  }
}
