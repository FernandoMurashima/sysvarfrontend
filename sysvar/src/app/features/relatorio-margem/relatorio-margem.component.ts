import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Loja } from '../../core/models/loja';
import { RelatorioMargem, RelatorioMargemLoja, RelatorioMargemProduto } from '../../core/models/venda-pdv';
import { LojasService } from '../../core/services/lojas.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';

type AbaMargem = 'produtos' | 'lojas';

@Component({
  selector: 'app-relatorio-margem',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './relatorio-margem.component.html',
  styleUrls: ['./relatorio-margem.component.css'],
})
export class RelatorioMargemComponent implements OnInit {
  private api = inject(VendaPdvService);
  private lojasApi = inject(LojasService);

  loading = false;
  errorMsg = '';
  aba: AbaMargem = 'produtos';
  lojas: Loja[] = [];
  relatorio: RelatorioMargem | null = null;

  filtros = {
    loja: '',
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
      relatorio: this.api.relatorioMargem(this.filtros),
    }).subscribe({
      next: ({ lojas, relatorio }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.relatorio = relatorio;
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
    this.api.relatorioMargem(this.filtros).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
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

  lojaId(loja: Loja): number | null {
    return loja.Idloja ?? loja.id ?? null;
  }

  get produtos(): RelatorioMargemProduto[] {
    return this.relatorio?.produtos ?? [];
  }

  get lojasResumo(): RelatorioMargemLoja[] {
    return this.relatorio?.lojas ?? [];
  }

  money(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  percent(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  valorClass(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    if (n > 0) return 'valor-pos';
    if (n < 0) return 'valor-neg';
    return 'valor-muted';
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
    const obj = err as { error?: { detail?: string }; message?: string };
    return obj?.error?.detail || obj?.message || 'Falha ao carregar o relatório de margem.';
  }
}
