import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { DreDetalhe, DreGerencial, DreGrupo } from '../../core/models/dre-gerencial';
import { Loja } from '../../core/models/loja';
import { LojasService } from '../../core/services/lojas.service';
import { MovimentacoesFinanceirasService } from '../../core/services/movimentacoes-financeiras.service';

type AbaDre = 'sintetico' | 'detalhe';

@Component({
  selector: 'app-dre-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dre-gerencial.component.html',
  styleUrls: ['./dre-gerencial.component.css'],
})
export class DreGerencialComponent implements OnInit {
  private api = inject(MovimentacoesFinanceirasService);
  private lojasApi = inject(LojasService);

  loading = false;
  errorMsg = '';
  aba: AbaDre = 'sintetico';
  lojas: Loja[] = [];
  dre: DreGerencial | null = null;

  filtros = {
    loja: '',
    data_ini: '',
    data_fim: '',
    regime: 'caixa',
  };

  ngOnInit(): void {
    this.definirPeriodoPadrao();
    this.carregarBase();
  }

  carregarBase(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list({ page_size: 5000 }),
      dre: this.api.dre(this.filtros),
    }).subscribe({
      next: ({ lojas, dre }) => {
        this.lojas = this.unwrap<Loja>(lojas);
        this.dre = dre;
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
    this.api.dre(this.filtros).subscribe({
      next: dre => {
        this.dre = dre;
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
    this.filtros.regime = 'caixa';
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

  get grupos(): DreGrupo[] {
    return this.dre?.grupos ?? [];
  }

  get detalhes(): DreDetalhe[] {
    return this.dre?.detalhes ?? [];
  }

  money(value: string | number | null | undefined): string {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const detail = (err as { error?: { detail?: string } })?.error?.detail;
    return detail || 'Nao foi possivel carregar o DRE.';
  }
}
