import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { CashbackConfig, CashbackMovimento } from '../../core/models/cashback';
import { Cliente } from '../../core/models/clientes';
import { CashbackService } from '../../core/services/cashback.service';
import { ClientesService } from '../../core/services/clientes.service';

@Component({
  selector: 'app-cashback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cashback.component.html',
  styleUrls: ['./cashback.component.css']
})
export class CashbackComponent implements OnInit {
  private cashbackApi = inject(CashbackService);
  private clientesApi = inject(ClientesService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  clientes: Cliente[] = [];
  clienteId: number | null = null;
  saldo = 0;
  movimentos: CashbackMovimento[] = [];

  config: CashbackConfig = {
    nome: 'Regra padrão',
    ativo: false,
    percentual: 0,
    validade_dias: 180,
    valor_minimo_geracao: 0,
    valor_minimo_uso: 0,
    limite_uso_percentual: 100,
    consumidor_final_participa: false
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      config: this.cashbackApi.configAtiva(),
      clientes: this.clientesApi.list({ ativo: 'true', page_size: 1000 })
    }).subscribe({
      next: data => {
        this.config = data.config;
        this.clientes = this.unwrap<Cliente>(data.clientes).filter(c => c.ativo !== false);
        this.clienteId = this.clientes.find(c => !this.ehConsumidorFinal(c))?.id ?? this.clientes[0]?.id ?? null;
        this.loading = false;
        this.errorMsg = '';
        this.carregarExtrato();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar cashback.';
      }
    });
  }

  salvarConfig(): void {
    this.saving = true;
    this.cashbackApi.salvarConfig({
      ...this.config,
      percentual: this.numero(this.config.percentual),
      validade_dias: Number(this.config.validade_dias || 0),
      valor_minimo_geracao: this.numero(this.config.valor_minimo_geracao),
      valor_minimo_uso: this.numero(this.config.valor_minimo_uso),
      limite_uso_percentual: this.numero(this.config.limite_uso_percentual)
    }).subscribe({
      next: config => {
        this.config = config;
        this.saving = false;
        this.successMsg = 'Regra de cashback salva.';
        this.errorMsg = '';
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar regra de cashback.';
      }
    });
  }

  carregarExtrato(): void {
    if (!this.clienteId) return;
    forkJoin({
      saldo: this.cashbackApi.saldo(this.clienteId),
      movimentos: this.cashbackApi.movimentos({ cliente: this.clienteId })
    }).subscribe({
      next: data => {
        this.saldo = this.numero(data.saldo.saldo);
        this.movimentos = this.unwrap<CashbackMovimento>(data.movimentos);
        this.errorMsg = '';
      },
      error: () => {
        this.saldo = 0;
        this.movimentos = [];
        this.errorMsg = 'Falha ao carregar extrato do cliente.';
      }
    });
  }

  tipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      CREDITO: 'Crédito',
      DEBITO: 'Uso',
      ESTORNO: 'Estorno',
      EXPIRACAO: 'Expiração'
    };
    return labels[tipo] || tipo;
  }

  documento(mov: CashbackMovimento): string {
    return mov.documento_origem || mov.documento_uso || '-';
  }

  private ehConsumidorFinal(cliente: Cliente): boolean {
    const cpf = String(cliente.cpf || '').replace(/\D/g, '');
    return cpf === '00000000000' || String(cliente.nome_cliente || '').toLowerCase().includes('consumidor final');
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private numero(value: any): number {
    return Number(value || 0);
  }
}
