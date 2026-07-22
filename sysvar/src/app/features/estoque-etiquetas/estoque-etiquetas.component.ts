import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Produto } from '../../core/models/produto';
import { ProdutoDetalheService, ProdutoSku } from '../../core/services/produto-detalhe.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

type LabelRow = {
  produto: Produto;
  sku: ProdutoSku;
  quantidade: number;
};

type PrintLabel = {
  nome: string;
  referencia: string;
  ean: string;
  bars: { width: number; black: boolean; guard: boolean }[];
};

@Component({
  selector: 'app-estoque-etiquetas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './estoque-etiquetas.component.html',
  styleUrls: ['./estoque-etiquetas.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EstoqueEtiquetasComponent implements OnInit {
  private produtosApi = inject(ProdutosService);
  private skusApi = inject(ProdutoDetalheService);

  loading = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  quantidade = 1;
  produtos: Produto[] = [];
  skus: ProdutoSku[] = [];
  selecionado: ProdutoSku | null = null;
  etiquetas: LabelRow[] = [];
  destaque: LabelRow | null = null;
  papel: 'A4' | 'ROLO' = 'A4';
  larguraEtiquetaMm = 80;
  alturaEtiquetaMm = 30;
  margemMm = 6;
  espacoHorizontalMm = 2;
  espacoVerticalMm = 2;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.produtosApi.list({ page_size: 5000, ativo: 'true' }).subscribe({
      next: produtosRes => {
        this.produtos = this.unwrap<Produto>(produtosRes).filter(p => p.tipo_produto === '1' || p.tipo_produto === '3');
        this.skusApi.list({ page_size: 5000 }).subscribe({
          next: skusRes => {
            const produtoIds = new Set(this.produtos.map(p => Number(p.Idproduto || 0)));
            this.skus = this.unwrap<ProdutoSku>(skusRes).filter(s => !!s.ean13 && produtoIds.has(Number(s.produto)));
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.errorMsg = 'Falha ao carregar SKUs.';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar produtos.';
      }
    });
  }

  get sugestoes(): string[] {
    return this.skus.map(sku => this.skuOptionLabel(sku));
  }

  buscar(): void {
    const termo = this.normalize(this.search);
    this.selecionado = this.skus.find(sku => this.normalize(this.skuOptionLabel(sku)) === termo)
      || this.skus.find(sku => this.normalize(this.skuOptionLabel(sku)).includes(termo))
      || null;
    if (!this.selecionado) {
      this.errorMsg = 'Produto/SKU não encontrado.';
      return;
    }
    this.errorMsg = '';
  }

  adicionar(): void {
    if (!this.selecionado) {
      this.buscar();
    }
    if (!this.selecionado) return;
    const produto = this.produtoDoSku(this.selecionado);
    if (!produto) {
      this.errorMsg = 'Produto do SKU não encontrado.';
      return;
    }
    const qtd = Math.max(1, Number(this.quantidade || 1));
    const existente = this.etiquetas.find(row => row.sku.IdprodutoDetalhe === this.selecionado?.IdprodutoDetalhe);
    if (existente) {
      existente.quantidade += qtd;
      this.destaque = existente;
    } else {
      const row = { produto, sku: this.selecionado, quantidade: qtd };
      this.etiquetas.push(row);
      this.destaque = row;
    }
    this.successMsg = 'Etiqueta adicionada.';
    this.search = '';
    this.selecionado = null;
    this.quantidade = 1;
  }

  remover(row: LabelRow): void {
    this.etiquetas = this.etiquetas.filter(item => item !== row);
    if (this.destaque === row) this.destaque = null;
  }

  limpar(): void {
    this.etiquetas = [];
    this.successMsg = '';
    this.destaque = null;
  }

  limparBusca(): void {
    this.search = '';
    this.selecionado = null;
    this.errorMsg = '';
  }

  consultar(row: LabelRow): void {
    this.destaque = row;
  }

  imprimirLinha(row: LabelRow): void {
    this.destaque = row;
    const labels: PrintLabel[] = [];
    const label = this.toPrintLabel(row);
    for (let i = 0; i < Math.max(1, Number(row.quantidade || 1)); i++) {
      labels.push(label);
    }
    this.printLabels(labels);
  }

  imprimir(): void {
    if (!this.etiquetas.length) {
      this.errorMsg = 'Adicione ao menos uma etiqueta.';
      return;
    }
    this.printLabels(this.etiquetasImpressao);
  }

  get etiquetasImpressao(): PrintLabel[] {
    const labels: PrintLabel[] = [];
    this.etiquetas.forEach(row => {
      const label = this.toPrintLabel(row);
      for (let i = 0; i < Math.max(1, Number(row.quantidade || 1)); i++) {
        labels.push(label);
      }
    });
    return labels;
  }

  get larguraPapelMm(): number {
    return this.papel === 'A4' ? 210 : this.larguraEtiquetaMm;
  }

  get alturaPapelMm(): number {
    return this.papel === 'A4' ? 297 : Math.max(this.alturaEtiquetaMm, this.etiquetasImpressao.length * this.alturaEtiquetaMm);
  }

  get etiquetasPorLinha(): number {
    if (this.papel === 'ROLO') return 1;
    const area = this.larguraPapelMm - (this.margemMm * 2);
    return Math.max(1, Math.floor((area + this.espacoHorizontalMm) / (this.larguraEtiquetaMm + this.espacoHorizontalMm)));
  }

  get linhasPorFolha(): number {
    if (this.papel === 'ROLO') return Math.max(1, this.etiquetasImpressao.length);
    const area = this.alturaPapelMm - (this.margemMm * 2);
    return Math.max(1, Math.floor((area + this.espacoVerticalMm) / (this.alturaEtiquetaMm + this.espacoVerticalMm)));
  }

  get etiquetasPorFolha(): number {
    return this.etiquetasPorLinha * this.linhasPorFolha;
  }

  get totalFolhas(): number {
    if (!this.etiquetasImpressao.length) return 0;
    if (this.papel === 'ROLO') return 1;
    return Math.ceil(this.etiquetasImpressao.length / this.etiquetasPorFolha);
  }

  get paginasPreview(): PrintLabel[][] {
    const labels = this.etiquetasImpressao;
    if (this.papel === 'ROLO') return labels.length ? [labels] : [];
    const paginas: PrintLabel[][] = [];
    for (let i = 0; i < labels.length; i += this.etiquetasPorFolha) {
      paginas.push(labels.slice(i, i + this.etiquetasPorFolha));
    }
    return paginas;
  }

  get sheetVars(): Record<string, string> {
    return {
      '--paper-w': `${this.larguraPapelMm}mm`,
      '--paper-h': `${this.alturaPapelMm}mm`,
      '--label-w': `${this.larguraEtiquetaMm}mm`,
      '--label-h': `${this.alturaEtiquetaMm}mm`,
      '--sheet-margin': `${this.margemMm}mm`,
      '--gap-x': `${this.espacoHorizontalMm}mm`,
      '--gap-y': `${this.espacoVerticalMm}mm`,
    };
  }

  produtoDoSku(sku: ProdutoSku): Produto | null {
    return this.produtos.find(p => Number(p.Idproduto) === Number(sku.produto)) || null;
  }

  skuOptionLabel(sku: ProdutoSku): string {
    const produto = this.produtoDoSku(sku);
    const nome = produto?.descricao_reduzida || produto?.descricao || 'Produto';
    const ref = produto?.referencia || '-';
    const cor = sku.cor_descricao || '-';
    const tamanho = sku.tamanho_descricao || '-';
    return `${ref} · ${nome} · ${cor}/${tamanho} · ${sku.ean13}`;
  }

  private toPrintLabel(row: LabelRow): PrintLabel {
    return {
      nome: (row.produto.descricao_reduzida || row.produto.descricao || '').toUpperCase(),
      referencia: row.produto.referencia || '-',
      ean: row.sku.ean13,
      bars: this.ean13Bars(row.sku.ean13)
    };
  }

  private ean13Bars(ean: string): { width: number; black: boolean; guard: boolean }[] {
    const digits = String(ean || '').replace(/\D/g, '');
    if (digits.length !== 13) return [];
    const leftPatterns: Record<string, string> = {
      '0': 'LLLLLL', '1': 'LLGLGG', '2': 'LLGGLG', '3': 'LLGGGL', '4': 'LGLLGG',
      '5': 'LGGLLG', '6': 'LGGGLL', '7': 'LGLGLG', '8': 'LGLGGL', '9': 'LGGLGL'
    };
    const enc: Record<string, Record<string, string>> = {
      L: { '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011', '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011' },
      G: { '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001', '4': '0011101', '5': '0111001', '6': '0000101', '7': '0010001', '8': '0001001', '9': '0010111' },
      R: { '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010', '4': '1011100', '5': '1001110', '6': '1010000', '7': '1000100', '8': '1001000', '9': '1110100' }
    };
    const left = leftPatterns[digits[0]];
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += enc[left[i - 1]][digits[i]];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += enc['R'][digits[i]];
    bits += '101';
    const bars: { width: number; black: boolean; guard: boolean }[] = [];
    let i = 0;
    while (i < bits.length) {
      const black = bits[i] === '1';
      let j = i + 1;
      while (j < bits.length && bits[j] === bits[i]) j++;
      const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      bars.push({ width: j - i, black, guard });
      i = j;
    }
    return bars;
  }

  private printLabels(labels: PrintLabel[]): void {
    const paginas = this.chunkLabels(labels);
    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) {
      this.errorMsg = 'Não foi possível abrir a janela de impressão.';
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiquetas Sysvar</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; }
            .sheet {
              width: ${this.larguraPapelMm}mm;
              min-height: ${this.alturaPapelMm}mm;
              padding: ${this.margemMm}mm;
              display: grid;
              grid-template-columns: repeat(${this.etiquetasPorLinha}, ${this.larguraEtiquetaMm}mm);
              grid-auto-rows: ${this.alturaEtiquetaMm}mm;
              gap: ${this.espacoVerticalMm}mm ${this.espacoHorizontalMm}mm;
              align-content: start;
              page-break-after: always;
              break-after: page;
            }
            .sheet:last-child { page-break-after: auto; break-after: auto; }
            .label {
              width: ${this.larguraEtiquetaMm}mm;
              height: ${this.alturaEtiquetaMm}mm;
              padding: 2mm 3mm;
              overflow: hidden;
              display: grid;
              grid-template-rows: 15mm auto auto auto;
              text-align: center;
              background: #fff;
              color: #000;
            }
            .barcode {
              height: 15mm;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .barcode span {
              height: 13mm;
              display: block;
              background: transparent;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .barcode span.black {
              background: #000 !important;
              box-shadow: inset 0 0 0 999px #000;
            }
            .barcode span.guard { height: 15mm; }
            .ean {
              font-size: 7pt;
              font-weight: 700;
              letter-spacing: 1px;
              line-height: 1;
              margin: .8mm 0 .6mm;
            }
            .name {
              font-size: 8.5pt;
              font-weight: 800;
              line-height: 1.08;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .ref {
              font-size: 6.5pt;
              font-weight: 700;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            @page { size: ${this.papel === 'A4' ? 'A4' : `${this.larguraPapelMm}mm ${this.alturaPapelMm}mm`}; margin: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${paginas.map(pagina => `
            <section class="sheet">
              ${pagina.map(label => this.labelPrintHtml(label)).join('')}
            </section>
          `).join('')}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private chunkLabels(labels: PrintLabel[]): PrintLabel[][] {
    if (this.papel === 'ROLO') return labels.length ? [labels] : [];
    const paginas: PrintLabel[][] = [];
    for (let i = 0; i < labels.length; i += this.etiquetasPorFolha) {
      paginas.push(labels.slice(i, i + this.etiquetasPorFolha));
    }
    return paginas;
  }

  private labelPrintHtml(label: PrintLabel): string {
    return `
      <article class="label">
        <div class="barcode">${label.bars.map(bar => (
          `<span class="${bar.black ? 'black' : ''} ${bar.guard ? 'guard' : ''}" style="width:${bar.width * 2}px"></span>`
        )).join('')}</div>
        <div class="ean">${this.escapeHtml(label.ean)}</div>
        <div class="name">${this.escapeHtml(label.nome)}</div>
        <div class="ref">REF: ${this.escapeHtml(label.referencia)}</div>
      </article>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private unwrap<T>(res: T[] | { results?: T[] } | any): T[] {
    return Array.isArray(res) ? res : (res?.results || []);
  }

  private normalize(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
