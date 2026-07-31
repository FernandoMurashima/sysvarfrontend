import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MercadoriaTransito } from '../../core/models/distribuicao';
import { DistribuicaoService } from '../../core/services/distribuicao.service';

interface NotaRecebimento {
  key: string;
  nfe_numero: string;
  loja_destino: number;
  loja_destino_nome: string;
  unidade_origem_nome: string;
  data_envio?: string | null;
  status: string;
  itens: MercadoriaTransito[];
  pecas: number;
  recebido: number;
  divergente: number;
}

@Component({
  selector: 'app-loja-recebimento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './loja-recebimento.component.html',
  styleUrls: ['./loja-recebimento.component.css'],
})
export class LojaRecebimentoComponent implements OnInit {
  private api = inject(DistribuicaoService);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  status = 'TRANS';
  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  transitos: MercadoriaTransito[] = [];
  notas: NotaRecebimento[] = [];
  selecionada: NotaRecebimento | null = null;

  get podeEditarModulo(): boolean {
    const tipo = this.auth.getUserType();
    if (['Admin', 'Diretor', 'Gerente', 'Caixa'].includes(tipo || '')) return this.auth.podeAcessarModulo('estoque') !== false;
    return this.auth.podeAcessarModulo('estoque', true) !== false;
  }
  get totalNotas(): number { return this.notas.length; }
  get pendentes(): number { return this.notas.filter(n => n.status === 'TRANS').length; }
  get recebidas(): number { return this.notas.filter(n => n.status === 'RECB').length; }
  get divergentes(): number { return this.notas.filter(n => n.status === 'DIV').length; }
  get totalPecas(): number { return this.notas.reduce((sum, n) => sum + n.pecas, 0); }
  get filtradas(): NotaRecebimento[] {
    const term = this.search.trim().toLowerCase();
    return this.notas.filter(n => !term || [n.nfe_numero, n.loja_destino_nome, n.unidade_origem_nome, ...n.itens.map(i => `${i.referencia} ${i.descricao} ${i.ean13}`)].some(v => String(v || '').toLowerCase().includes(term)));
  }
  get paginadas(): NotaRecebimento[] { return this.filtradas.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtradas.length / this.pageSize)); }
  get pageStart(): number { return this.filtradas.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.filtradas.length, this.page * this.pageSize); }

  ngOnInit(): void {
    this.load();
    window.addEventListener('sysvar-loja-recebimento-toggle-indicators', this.toggleIndicators);
    window.addEventListener('sysvar-loja-recebimento-toggle-filters', this.toggleFilters);
    window.addEventListener('sysvar-loja-recebimento-restore-view', this.restoreView);
  }

  indicatorsVisible = true;
  filtersVisible = true;
  private toggleIndicators = () => this.indicatorsVisible = !this.indicatorsVisible;
  private toggleFilters = () => this.filtersVisible = !this.filtersVisible;
  private restoreView = () => { this.indicatorsVisible = true; this.filtersVisible = true; };

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.api.listTransitos({ search: this.search, status: this.status, page_size: 1000 }).subscribe({
      next: resp => {
        this.transitos = this.unwrap<MercadoriaTransito>(resp);
        this.notas = this.groupNotas(this.transitos);
        if (this.selecionada) {
          this.selecionada = this.notas.find(n => n.key === this.selecionada?.key) || null;
          if (this.selecionada) this.preencherConferencia(this.selecionada);
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar recebimentos.');
      },
    });
  }

  selecionar(nota: NotaRecebimento): void {
    this.selecionada = nota;
    this.preencherConferencia(nota);
  }

  confirmar(): void {
    if (!this.selecionada || !this.podeEditarModulo) return;
    const itens = this.selecionada.itens.map(item => ({ transito: item.id, quantidade_recebida: item.recebido_ui ?? item.quantidade_enviada }));
    this.api.confirmarRecebimentoNota({ nfe_numero: this.selecionada.nfe_numero, loja_destino: this.selecionada.loja_destino, itens }).subscribe({
      next: () => {
        this.successMsg = `Recebimento da NF-e ${this.selecionada?.nfe_numero} lançado no estoque.`;
        this.selecionada = null;
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao confirmar recebimento.'),
    });
  }

  marcarTudo(): void {
    if (!this.selecionada) return;
    this.selecionada.itens.forEach(item => item.recebido_ui = this.num(item.quantidade_enviada));
  }

  zerarConferencia(): void {
    if (!this.selecionada) return;
    this.selecionada.itens.forEach(item => item.recebido_ui = 0);
  }

  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.status = 'TRANS'; this.page = 1; this.load(); }
  firstPage(): void { this.page = 1; }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }
  lastPage(): void { this.page = this.totalPages; }
  onPageSizeChange(size: string): void { this.pageSize = Number(size) || 20; this.page = 1; }
  isSelected(nota: NotaRecebimento): boolean { return this.selecionada?.key === nota.key; }
  statusLabel(status: string): string { return ({ TRANS: 'Em trânsito', RECB: 'Recebida', DIV: 'Divergente', AG_EXP: 'Aguardando' } as Record<string, string>)[status] || status; }
  statusClass(status: string): string { return `st-${status.toLowerCase()}`; }
  num(v: unknown): number { return Number(v || 0); }
  qty(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
  money(v: unknown): string { return this.num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  itemTotal(item: MercadoriaTransito): number { return this.num(item.quantidade_enviada) * this.num(item.valor_unitario); }
  trackByNota(_: number, item: NotaRecebimento): string { return item.key; }
  trackByItem(_: number, item: MercadoriaTransito): number { return item.id; }

  private preencherConferencia(nota: NotaRecebimento): void {
    nota.itens.forEach(item => {
      item.recebido_ui = item.recebido_ui ?? item.quantidade_enviada;
    });
  }

  private groupNotas(rows: MercadoriaTransito[]): NotaRecebimento[] {
    const map = new Map<string, NotaRecebimento>();
    rows.forEach(row => {
      const nfe = row.nfe_numero || row.pedido_numero || '-';
      const key = `${row.loja_destino}-${nfe}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nfe_numero: nfe,
          loja_destino: row.loja_destino,
          loja_destino_nome: row.loja_destino_nome || '-',
          unidade_origem_nome: row.unidade_origem_nome || '-',
          data_envio: row.data_envio,
          status: row.status,
          itens: [],
          pecas: 0,
          recebido: 0,
          divergente: 0,
        });
      }
      const nota = map.get(key)!;
      nota.itens.push(row);
      nota.pecas += this.num(row.quantidade_enviada);
      nota.recebido += this.num(row.quantidade_recebida);
      nota.divergente += this.num(row.quantidade_divergente);
      if (row.status === 'DIV') nota.status = 'DIV';
      if (row.status === 'TRANS' && nota.status !== 'DIV') nota.status = 'TRANS';
    });
    return Array.from(map.values()).sort((a, b) => String(b.data_envio || '').localeCompare(String(a.data_envio || '')));
  }

  private unwrap<T>(resp: T[] | { results: T[] } | any): T[] { return Array.isArray(resp) ? resp : (resp?.results || []); }
  private errorText(err: any, fallback: string): string {
    const data = err?.error;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    return String(first || fallback);
  }
}
