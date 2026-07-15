import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Cliente } from '../../core/models/clientes';
import { Loja } from '../../core/models/loja';
import { ValeTroca, ValeTrocaMovimento } from '../../core/models/vale-troca';
import { ClientesService } from '../../core/services/clientes.service';
import { LojasService } from '../../core/services/lojas.service';
import { ValeTrocaService } from '../../core/services/vale-troca.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-vales-troca',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSuggestComponent],
  templateUrl: './vales-troca.component.html',
  styleUrls: ['./vales-troca.component.css']
})
export class ValesTrocaComponent implements OnInit {
  private valesApi = inject(ValeTrocaService);
  private lojasApi = inject(LojasService);
  private clientesApi = inject(ClientesService);
  private router = inject(Router);

  loading = false;
  loadingBase = false;
  errorMsg = '';
  successMsg = '';

  lojas: Loja[] = [];
  clientes: Cliente[] = [];
  vales: ValeTroca[] = [];
  selecionado: ValeTroca | null = null;

  lojaId: number | null = null;
  clienteId: number | null = null;
  status = 'ABERTO';
  documento = '';

  get documentoSuggestions(): string[] {
    const valores = this.vales.flatMap(vale => [
      vale.documento,
      vale.cliente_nome,
      vale.venda_origem_documento,
      vale.devolucao_documento
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
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
        this.clientes = this.unwrap<Cliente>(data.clientes).filter(cliente => cliente.ativo !== false);
        this.loadingBase = false;
        this.consultar();
      },
      error: () => {
        this.loadingBase = false;
        this.errorMsg = 'Falha ao carregar filtros.';
        this.consultar();
      }
    });
  }

  consultar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.valesApi.list({
      loja: this.lojaId,
      cliente: this.clienteId,
      status: this.status,
      documento: this.documento.trim()
    }).subscribe({
      next: resp => {
        this.vales = this.unwrap<ValeTroca>(resp);
        this.selecionado = this.vales[0] ?? null;
        this.loading = false;
      },
      error: err => {
        this.vales = [];
        this.selecionado = null;
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Falha ao consultar vales-troca.';
      }
    });
  }

  limpar(): void {
    this.lojaId = null;
    this.clienteId = null;
    this.status = 'ABERTO';
    this.documento = '';
    this.consultar();
  }

  selecionar(vale: ValeTroca): void {
    this.selecionado = vale;
  }

  irHome(): void {
    this.router.navigate(['/home']);
  }

  totalSaldo(): number {
    return this.vales.reduce((total, vale) => total + Number(vale.saldo || 0), 0);
  }

  tipoMovimentoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CREDITO: 'Crédito',
      USO: 'Uso em venda',
      ESTORNO: 'Estorno'
    };
    return labels[tipo] || tipo;
  }

  documentoMovimento(mov: ValeTrocaMovimento): string {
    return mov.venda_documento || '-';
  }

  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] {
    return Array.isArray(resp) ? resp : (resp?.results ?? []);
  }
}
