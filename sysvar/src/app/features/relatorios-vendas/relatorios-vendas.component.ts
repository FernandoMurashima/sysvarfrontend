import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';
import { RelatorioVendas } from '../../core/models/venda-pdv';
import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { VendaPdvService } from '../../core/services/venda-pdv.service';

type RelatorioAba = 'lojas' | 'vendedores' | 'pagamentos' | 'produtos' | 'colecoes' | 'grupos';

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
  telaCheia = false;
  abaAtiva: RelatorioAba = 'lojas';
  grupoSelecionado = '';
  colecaoSelecionada = '';

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

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.telaCheia = !!document.fullscreenElement;
  }

  async alternarTelaCheia(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      this.errorMsg = 'Não foi possível ativar a tela cheia neste navegador.';
    }
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

  onLojaChange(): void {
    if (this.vendedorId && !this.vendedoresFiltrados.some(v => v.id === this.vendedorId)) {
      this.vendedorId = null;
    }
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

  maxLoja(): number {
    return Math.max(0, ...(this.relatorio?.lojas ?? []).map(l => this.valor(l.total)));
  }

  maxPagamento(): number {
    return Math.max(0, ...(this.relatorio?.pagamentos ?? []).map(p => this.valor(p.total)));
  }

  maxProduto(): number {
    return Math.max(0, ...(this.relatorio?.produtos ?? []).map(p => this.valor(p.total)));
  }

  maxColecao(): number {
    return Math.max(0, ...(this.relatorio?.colecoes ?? []).map(c => this.valor(c.total)));
  }

  maxGrupo(): number {
    return Math.max(0, ...(this.relatorio?.grupos ?? []).map(g => this.valor(g.total)));
  }

  maxSubgrupo(): number {
    return Math.max(0, ...(this.relatorio?.subgrupos ?? []).map(s => this.valor(s.total)));
  }

  selecionarAba(aba: RelatorioAba): void {
    this.abaAtiva = aba;
    if (aba !== 'grupos') this.grupoSelecionado = '';
    if (aba !== 'colecoes') this.colecaoSelecionada = '';
  }

  selecionarGrupo(grupo: string): void {
    this.grupoSelecionado = this.grupoSelecionado === grupo ? '' : grupo;
  }

  selecionarColecao(colecao: string): void {
    this.colecaoSelecionada = this.colecaoSelecionada === colecao ? '' : colecao;
  }

  get vendedoresFiltrados(): Funcionario[] {
    if (!this.lojaId) return this.vendedores;
    return this.vendedores.filter(vendedor => Number(vendedor.idloja) === Number(this.lojaId));
  }

  get produtosDaColecao() {
    if (!this.colecaoSelecionada) return [];
    return (this.relatorio?.produtos ?? []).filter(item => item.colecao === this.colecaoSelecionada);
  }

  maxProdutoColecao(): number {
    return Math.max(0, ...this.produtosDaColecao.map(p => this.valor(p.total)));
  }

  get subgruposDoGrupo() {
    if (!this.grupoSelecionado) return [];
    return (this.relatorio?.subgrupos ?? []).filter(item => item.grupo === this.grupoSelecionado);
  }

  maxSubgrupoSelecionado(): number {
    return Math.max(0, ...this.subgruposDoGrupo.map(s => this.valor(s.total)));
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
