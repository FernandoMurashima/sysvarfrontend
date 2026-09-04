import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RecebimentoMercadoria } from '../../core/models/recebimento-mercadoria';
import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';

@Component({
  selector: 'app-recebimentos-mercadoria',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './recebimentos-mercadoria.component.html',
  styleUrls: ['./recebimentos-mercadoria.component.css'],
})
export class RecebimentosMercadoriaComponent implements OnInit {
  private api = inject(RecebimentoMercadoriaService);

  rows: RecebimentoMercadoria[] = [];
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.listar({ page_size: 50 }).pipe(finalize(() => this.loading = false)).subscribe({
      next: resp => this.rows = Array.isArray(resp) ? resp : resp.results || [],
      error: () => this.errorMsg = 'Não foi possível carregar os recebimentos.',
    });
  }

  nfe(row: RecebimentoMercadoria): string {
    const xml = row.xml_fornecedor_dados;
    return xml ? `${xml.numero || '-'} / ${xml.serie || '-'}` : '-';
  }

  valor(row: RecebimentoMercadoria): number {
    return Number(row.xml_fornecedor_dados?.valor_total || 0);
  }

  lojaNome(row: RecebimentoMercadoria): string {
    return row.loja_nome || 'Estabelecimento não identificado';
  }

  fornecedorNome(row: RecebimentoMercadoria): string {
    return row.fornecedor_nome || 'Fornecedor não identificado';
  }

  trackById(_: number, row: RecebimentoMercadoria): number {
    return row.id;
  }
}
