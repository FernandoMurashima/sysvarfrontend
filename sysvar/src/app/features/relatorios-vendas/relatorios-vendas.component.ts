import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { RelatorioVendas } from '../../core/models/venda-pdv';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';

@Component({
  selector: 'app-relatorios-vendas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios-vendas.component.html',
  styleUrls: ['./relatorios-vendas.component.css']
})
export class RelatoriosVendasComponent implements OnInit {
  private vendasApi = inject(VendaPdvService);
  private lojasApi = inject(LojasService);
  private funcionariosApi = inject(FuncionariosService);

  loading = false;
  errorMsg = '';
  lojaId: number | null = null;
  vendedorId: number | null = null;
  dataIni = '';
  dataFim = '';

  lojas: Loja[] = [];
  vendedores: Funcionario[] = [];
  relatorio: RelatorioVendas | null = null;

  ngOnInit(): void {
    forkJoin({
      lojas: this.lojasApi.list(),
      vendedores: this.funcionariosApi.list({ page_size: 500 })
    }).subscribe({
      next: data => {
        this.lojas = this.unwrap<Loja>(data.lojas);
        this.vendedores = this.unwrap<Funcionario>(data.vendedores).filter(v => v.ativo !== false);
        this.carregar();
      },
      error: () => {
        this.errorMsg = 'Falha ao carregar filtros do relatório.';
      }
    });
  }

  carregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.vendasApi.relatorioVendas({
      loja: this.lojaId,
      vendedor: this.vendedorId,
      data_ini: this.dataIni,
      data_fim: this.dataFim
    }).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar relatório de vendas.';
      }
    });
  }

  valor(value: string | number | null | undefined): number {
    return Number(value || 0);
  }

  percent(value: string | number, max: number): number {
    const base = Number(max || 0);
    if (!base) return 0;
    return Math.max(4, Math.round((Number(value || 0) / base) * 100));
  }

  maxVendedor(): number {
    return Math.max(0, ...(this.relatorio?.vendedores ?? []).map(v => this.valor(v.total)));
  }

  maxProduto(): number {
    return Math.max(0, ...(this.relatorio?.produtos ?? []).map(p => this.valor(p.total)));
  }

  maxColecao(): number {
    return Math.max(0, ...(this.relatorio?.colecoes ?? []).map(c => this.valor(c.total)));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
