import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfigFinanceiraService } from '../../core/services/config-financeira.service';
import { NatLancamentosService } from '../../core/services/natureza-lancamento.service';
import { NatLancamento } from '../../core/models/natureza-lancamento';

@Component({
  selector: 'app-config-financeira',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './config-financeira.component.html',
  styleUrls: ['./config-financeira.component.css']
})
export class ConfigFinanceiraComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ConfigFinanceiraService);
  private naturezasApi = inject(NatLancamentosService);

  naturezas: NatLancamento[] = [];
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    natureza_juros_pagos: [null as number | null],
    natureza_juros_recebidos: [null as number | null],
    natureza_tarifas_pagas: [null as number | null],
    natureza_multas_pagas: [null as number | null],
    natureza_multas_recebidas: [null as number | null],
    natureza_descontos_concedidos: [null as number | null],
    natureza_descontos_obtidos: [null as number | null],
  });

  ngOnInit(): void {
    this.loading = true;
    this.naturezasApi.list({ page_size: 500, ordering: 'codigo' }).subscribe({
      next: res => {
        this.naturezas = this.unwrap<NatLancamento>(res).filter(n => n.ativo !== false);
        this.carregar();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar naturezas.';
      }
    });
  }

  carregar(): void {
    this.api.atual().subscribe({
      next: config => {
        this.form.patchValue({
          natureza_juros_pagos: config.natureza_juros_pagos ?? null,
          natureza_juros_recebidos: config.natureza_juros_recebidos ?? null,
          natureza_tarifas_pagas: config.natureza_tarifas_pagas ?? null,
          natureza_multas_pagas: config.natureza_multas_pagas ?? null,
          natureza_multas_recebidas: config.natureza_multas_recebidas ?? null,
          natureza_descontos_concedidos: config.natureza_descontos_concedidos ?? null,
          natureza_descontos_obtidos: config.natureza_descontos_obtidos ?? null,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar configuração financeira.';
      }
    });
  }

  salvar(): void {
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    this.api.salvar(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Configuração financeira salva.';
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar configuração financeira.';
      }
    });
  }

  despesas(): NatLancamento[] {
    return this.naturezas.filter(n => String(n.natureza_operacao || '').toUpperCase() === 'DESPESA');
  }

  receitas(): NatLancamento[] {
    return this.naturezas.filter(n => String(n.natureza_operacao || '').toUpperCase() === 'RECEITA');
  }

  private unwrap<T>(res: T[] | { results?: T[] }): T[] {
    return Array.isArray(res) ? res : (res.results ?? []);
  }
}
