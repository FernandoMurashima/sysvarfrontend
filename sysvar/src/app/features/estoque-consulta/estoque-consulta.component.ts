import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Estoque } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-estoque-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './estoque-consulta.component.html',
  styleUrls: ['./estoque-consulta.component.css']
})
export class EstoqueConsultaComponent implements OnInit {
  private api = inject(EstoqueService);
  private lojasApi = inject(LojasService);

  loading = false;
  errorMsg = '';
  search = '';
  loja = '';
  colecao = '';
  estacao = '';
  estoques: Estoque[] = [];
  lojas: Loja[] = [];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({
      lojas: this.lojasApi.list(),
      estoque: this.api.list({ search: this.search, loja: this.loja, colecao: this.colecao, estacao: this.estacao })
    }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.estoques = this.unwrap<Estoque>(res.estoque);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao consultar estoque.';
      }
    });
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  saldoDisponivel(item: Estoque): number {
    return Number(item.Estoque || 0) - Number(item.reserva || 0);
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
