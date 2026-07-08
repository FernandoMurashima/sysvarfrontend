import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FornecedoresService } from '../../core/services/fornecedores.service';
import { LojasService } from '../../core/services/lojas.service';
import { NotasFiscaisEntradaService } from '../../core/services/notas-fiscais-entrada.service';
import { PedidoCompra, PedidosCompraService } from '../../core/services/pedidos-compra.service';
import {
  NotaFiscalEntrada,
  NotaFiscalEntradaPedidoItem,
} from '../../core/models/nota-fiscal-entrada';

type Option = { id: number; label: string };

type ItemRecebimentoUI = NotaFiscalEntradaPedidoItem & {
  qtd_receber: number;
  preco_unit_nf: number;
  desconto_item: number;
  total_item: number;
};

@Component({
  selector: 'app-notas-fiscais-entrada',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './notas-fiscais-entrada.component.html',
  styleUrls: ['./notas-fiscais-entrada.component.css'],
})
export class NotasFiscaisEntradaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private notasApi = inject(NotasFiscaisEntradaService);
  private pedidosApi = inject(PedidosCompraService);
  private lojasApi = inject(LojasService);
  private fornecedoresApi = inject(FornecedoresService);

  view = signal<'list' | 'form'>('list');
  notaAtual = signal<NotaFiscalEntrada | null>(null);
  loading = false;
  saving = false;
  submitted = false;
  mensagem = '';
  erro = '';
  confirmModal: {
    action: 'removerItem' | 'fecharNota' | 'cancelarNota';
    title: string;
    text: string;
    item?: ItemRecebimentoUI;
  } | null = null;

  search = '';
  notas: NotaFiscalEntrada[] = [];
  notasFiltradas: NotaFiscalEntrada[] = [];
  notasPagina: NotaFiscalEntrada[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  pedidosAprovados: PedidoCompra[] = [];
  lojas: Option[] = [];
  fornecedores: Option[] = [];
  private lojaMap = new Map<number, string>();
  private fornecedorMap = new Map<number, string>();

  itensPedido: ItemRecebimentoUI[] = [];
  loadingItens = false;

  form: FormGroup = this.fb.group({
    pedido_compra: [null, Validators.required],
    modelo: ['55', [Validators.required, Validators.maxLength(2)]],
    serie: [''],
    numero: ['', Validators.required],
    chave_acesso: [''],
    dt_emissao: [this.hojeISO(), Validators.required],
    dt_entrada: [this.hojeISO(), Validators.required],
    valor_frete: [0, [Validators.min(0)]],
    observacoes: [''],
  });

  get total(): number {
    return this.notasFiltradas.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadPedidosAprovados();
    this.loadNotas();
  }

  private hojeISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  private loadLookups(): void {
    this.lojasApi.list({ ordering: 'nome_loja', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.lojas = this.arrayOrResults<any>(resp).map((l: any) => {
          const id = Number(l.id ?? l.Idloja);
          const nome = String(l.nome_loja ?? l.Nome ?? '');
          this.lojaMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(l => !!l.id);
      },
    });

    this.fornecedoresApi.list({ ordering: 'nome_fornecedor', page_size: 2000 }).subscribe({
      next: (resp: any) => {
        this.fornecedores = this.arrayOrResults<any>(resp).map((f: any) => {
          const id = Number(f.id ?? f.Idfornecedor);
          const nome = String(f.nome_fornecedor ?? f.RazaoSocial ?? f.NomeFantasia ?? '');
          this.fornecedorMap.set(id, nome);
          return { id, label: `${id} - ${nome}` };
        }).filter(f => !!f.id);
      },
    });
  }

  private loadPedidosAprovados(): void {
    this.pedidosApi.listar({ status: 'AP', page_size: 1000 }).subscribe({
      next: (resp: any) => {
        this.pedidosAprovados = this.arrayOrResults<PedidoCompra>(resp);
      },
      error: () => {
        this.pedidosAprovados = [];
      },
    });
  }

  loadNotas(): void {
    this.loading = true;
    this.notasApi.listar({ page_size: 1000 }).subscribe({
      next: (resp: any) => {
        this.notas = this.arrayOrResults<NotaFiscalEntrada>(resp);
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.notas = [];
        this.notasFiltradas = [];
        this.notasPagina = [];
        this.loading = false;
        this.erro = 'Não foi possível carregar as notas fiscais.';
      },
    });
  }

  applyFilter(): void {
    const term = (this.search || '').toLowerCase().trim();
    let base = this.notas.slice();

    if (term) {
      base = base.filter(n => {
        const pedido = String(n.pedido_compra ?? '');
        const numero = String(n.numero ?? '').toLowerCase();
        const serie = String(n.serie ?? '').toLowerCase();
        const chave = String(n.chave_acesso ?? '').toLowerCase();
        return pedido.includes(term) || numero.includes(term) || serie.includes(term) || chave.includes(term);
      });
    }

    this.notasFiltradas = base;
    this.page = 1;
    this.applyPage();
  }

  private applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.notasPagina = this.notasFiltradas.slice(start, start + this.pageSize);
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.applyFilter();
  }

  clearSearch(): void {
    this.search = '';
    this.applyFilter();
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 20;
    this.page = 1;
    this.applyPage();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }

  novo(): void {
    this.submitted = false;
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.form.reset({
      pedido_compra: null,
      modelo: '55',
      serie: '',
      numero: '',
      chave_acesso: '',
      dt_emissao: this.hojeISO(),
      dt_entrada: this.hojeISO(),
      valor_frete: 0,
      observacoes: '',
    });
    this.form.enable();
    this.view.set('form');
  }

  voltarLista(): void {
    this.view.set('list');
    this.notaAtual.set(null);
    this.itensPedido = [];
    this.loadNotas();
  }

  editar(nota: NotaFiscalEntrada): void {
    this.mensagem = '';
    this.erro = '';
    this.notaAtual.set(nota);
    this.form.reset({
      pedido_compra: nota.pedido_compra,
      modelo: nota.modelo,
      serie: nota.serie,
      numero: nota.numero,
      chave_acesso: nota.chave_acesso,
      dt_emissao: nota.dt_emissao,
      dt_entrada: nota.dt_entrada,
      valor_frete: Number(nota.valor_frete || 0),
      observacoes: nota.observacoes,
    });

    if (nota.status === 'AB') {
      this.form.enable();
    } else {
      this.form.disable();
    }

    this.view.set('form');
    this.carregarItensPedido(nota.id);
  }

  salvarCabecalho(): void {
    this.submitted = true;
    this.mensagem = '';
    this.erro = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const nota = this.notaAtual();
    this.saving = true;

    const req = nota
      ? this.notasApi.atualizar(nota.id, payload)
      : this.notasApi.criar(payload);

    req.subscribe({
      next: (saved) => {
        this.notaAtual.set(saved);
        this.saving = false;
        this.mensagem = 'Nota gravada.';
        this.carregarItensPedido(saved.id);
      },
      error: (err) => {
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar a nota.';
      },
    });
  }

  onPedidoChange(): void {
    const nota = this.notaAtual();
    if (nota) return;

    const pedidoId = Number(this.form.get('pedido_compra')?.value || 0);
    const pedido = this.pedidosAprovados.find(p => p.id === pedidoId);
    if (!pedido) return;

    this.form.patchValue({
      dt_emissao: pedido.emissao || this.hojeISO(),
      valor_frete: Number(pedido.frete || 0),
    });
  }

  private carregarItensPedido(notaId: number): void {
    this.loadingItens = true;
    this.notasApi.itensPedido(notaId).subscribe({
      next: (itens) => {
        this.itensPedido = itens.map(item => {
          const qtdNaNota = Number(item.qtd_na_nota || 0);
          const saldo = Number(item.saldo_total_recebivel || 0);
          const preco = Number(item.preco_unit_pedido || 0);
          const qtdInicial = qtdNaNota > 0 ? qtdNaNota : saldo;
          return {
            ...item,
            qtd_receber: qtdInicial,
            preco_unit_nf: preco,
            desconto_item: 0,
            total_item: qtdInicial * preco,
          };
        });
        this.loadingItens = false;
      },
      error: () => {
        this.itensPedido = [];
        this.loadingItens = false;
        this.erro = 'Não foi possível carregar os itens do pedido.';
      },
    });
  }

  recalcularItem(item: ItemRecebimentoUI): void {
    const bruto = Number(item.qtd_receber || 0) * Number(item.preco_unit_nf || 0);
    item.total_item = Math.max(0, bruto - Number(item.desconto_item || 0));
  }

  salvarItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;

    const qtd = Number(item.qtd_receber || 0);
    const saldoTotal = Number(item.saldo_total_recebivel || 0);
    if (qtd < 0 || qtd > saldoTotal) {
      this.erro = 'Quantidade recebida inválida para o saldo do pedido.';
      return;
    }
    if (!this.quantidadeFechaPack(item, qtd)) {
      const validas = (item.quantidades_validas || []).join(', ');
      this.erro = validas
        ? `A quantidade recebida do item ${item.pedido_item} precisa fechar com o pack. Use: ${validas}.`
        : `A quantidade recebida do item ${item.pedido_item} não fecha com a composição do pack.`;
      return;
    }

    const payload = {
      nota: nota.id,
      pedido_item: item.pedido_item,
      qtd_recebida: String(qtd),
      preco_unit_nf: String(Number(item.preco_unit_nf || 0)),
      desconto_item: String(Number(item.desconto_item || 0)),
    };

    const req = item.nota_item
      ? this.notasApi.atualizarItem(item.nota_item, payload)
      : this.notasApi.criarItem(payload);

    this.saving = true;
    req.subscribe({
      next: () => {
        this.saving = false;
        this.mensagem = 'Item gravado.';
        this.erro = '';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: (err) => {
        this.saving = false;
        this.erro = err?.error?.detail || 'Não foi possível gravar o item.';
      },
    });
  }

  descricaoItem(item: ItemRecebimentoUI): string {
    const partes = [
      item.produto_descricao || item.descricao_livre || '',
      item.produto_referencia ? `Ref. ${item.produto_referencia}` : '',
      item.cor_nome || '',
      item.pack_nome || '',
    ].filter(Boolean);
    return partes.join(' · ') || '-';
  }

  private quantidadeFechaPack(item: ItemRecebimentoUI, qtd: number): boolean {
    if (!item.pack || !item.quantidades_validas?.length || qtd <= 0) return true;
    return item.quantidades_validas.some(valor => Number(valor) === qtd);
  }

  removerItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB' || !item.nota_item) return;
    this.confirmModal = {
      action: 'removerItem',
      title: 'Remover item da nota',
      text: 'Confirma a remoção deste item da nota?',
      item,
    };
  }

  confirmarAcao(): void {
    const modal = this.confirmModal;
    if (!modal) return;
    if (modal.action === 'removerItem' && modal.item) {
      this.executarRemocaoItem(modal.item);
      return;
    }
    if (modal.action === 'fecharNota') {
      this.executarFechamentoNota();
      return;
    }
    if (modal.action === 'cancelarNota') {
      this.executarCancelamentoNota();
    }
  }

  fecharConfirmacao(): void {
    this.confirmModal = null;
  }

  private executarRemocaoItem(item: ItemRecebimentoUI): void {
    const nota = this.notaAtual();
    if (!nota || !item.nota_item) return;
    this.notasApi.removerItem(item.nota_item).subscribe({
      next: () => {
        this.confirmModal = null;
        this.mensagem = 'Item removido.';
        this.notasApi.get(nota.id).subscribe(n => this.notaAtual.set(n));
        this.carregarItensPedido(nota.id);
      },
      error: () => {
        this.erro = 'Não foi possível remover o item.';
      },
    });
  }

  fecharNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    this.confirmModal = {
      action: 'fecharNota',
      title: 'Fechar nota fiscal',
      text: `Confirma o fechamento da nota ${nota.numero}?`,
    };
  }

  private executarFechamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status !== 'AB') return;
    this.notasApi.fechar(nota.id).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        const fin = n.financeiro;
        const msgFin = fin?.disponivel
          ? ` Financeiro atualizado: ${fin.titulos_atualizados || 0} título(s).`
          : '';
        this.mensagem = `Nota fechada.${msgFin}`;
        this.erro = '';
        this.loadNotas();
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Não foi possível fechar a nota.';
      },
    });
  }

  cancelarNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    this.confirmModal = {
      action: 'cancelarNota',
      title: 'Cancelar nota fiscal',
      text: `Confirma o cancelamento da nota ${nota.numero}?`,
    };
  }

  private executarCancelamentoNota(): void {
    const nota = this.notaAtual();
    if (!nota || nota.status === 'CA') return;
    this.notasApi.cancelar(nota.id).subscribe({
      next: (n) => {
        this.confirmModal = null;
        this.notaAtual.set(n);
        this.form.disable();
        this.mensagem = 'Nota cancelada.';
        this.erro = '';
        this.loadNotas();
      },
      error: () => {
        this.erro = 'Não foi possível cancelar a nota.';
      },
    });
  }

  labelLoja(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.lojaMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  labelFornecedor(id: number | null | undefined): string {
    if (!id) return '';
    const nome = this.fornecedorMap.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  pedidoLabel(pedido: PedidoCompra): string {
    return `${pedido.id} - ${this.labelLoja(pedido.loja)} - ${this.labelFornecedor(pedido.fornecedor)}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { AB: 'Aberta', FE: 'Fechada', CA: 'Cancelada' };
    return labels[status] || status;
  }

  statusClass(status: string): string {
    if (status === 'FE') return 'badge-ok';
    if (status === 'CA') return 'badge-danger';
    return 'badge-off';
  }
}
