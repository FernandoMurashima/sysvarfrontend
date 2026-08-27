import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Fornecedor } from '../../core/models/fornecedor';
import { Produto } from '../../core/models/produto';
import { ProdutoFornecedor, ProdutoFornecedorPayload } from '../../core/models/produto-fornecedor';
import { AuthService } from '../../core/auth.service';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { ProdutosService } from '../../core/services/produtos.service';
import { ProdutoFornecedorService } from '../../core/services/produto-fornecedor.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';

@Component({
  selector: 'app-produto-fornecedor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchSuggestComponent],
  templateUrl: './produto-fornecedor.component.html',
  styleUrls: ['./produto-fornecedor.component.css'],
})
export class ProdutoFornecedorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ProdutoFornecedorService);
  private fornecedoresApi = inject(FornecedoresService);
  private produtosApi = inject(ProdutosService);
  private auth = inject(AuthService);

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  search = '';
  filterFornecedor: number | '' = '';
  filterCodigo = '';
  filterAtivo: 'true' | 'false' | '' = 'true';
  selected: ProdutoFornecedor | null = null;
  editando: ProdutoFornecedor | null = null;

  vinculos: ProdutoFornecedor[] = [];
  fornecedores: Fornecedor[] = [];
  produtos: Produto[] = [];

  form: FormGroup = this.fb.group({
    fornecedor: [null, Validators.required],
    codigo_produto_fornecedor: ['', [Validators.required, Validators.maxLength(80)]],
    descricao_fornecedor: [''],
    gtin_ean: [''],
    produto: [null, Validators.required],
    unidade_fornecedor: ['', [Validators.required, Validators.maxLength(20)]],
    fator_conversao: [1, [Validators.required, Validators.min(0.000001)]],
    ativo: [true],
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('produtos', true) !== false;
  }

  get sugestoesBusca(): string[] {
    const valores = this.vinculos.flatMap(v => [
      v.fornecedor_nome,
      v.codigo_produto_fornecedor,
      v.descricao_fornecedor,
      v.produto_descricao,
      v.produto_referencia,
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadAuxiliares();
    this.load();
  }

  loadAuxiliares(): void {
    forkJoin({
      fornecedores: this.fornecedoresApi.list({ page_size: 500, ordering: 'nome_fornecedor' }),
      produtos: this.produtosApi.list({ page_size: 500, ordering: 'descricao', ativo: 'true' }),
    }).subscribe({
      next: res => {
        this.fornecedores = this.unwrap<Fornecedor>(res.fornecedores);
        this.produtos = this.unwrap<Produto>(res.produtos);
      },
      error: () => this.errorMsg = 'Falha ao carregar fornecedores e produtos.',
    });
  }

  load(): void {
    this.loading = true;
    this.api.list({
      fornecedor: this.filterFornecedor,
      codigo: this.filterCodigo.trim(),
      search: this.search.trim(),
      ativo: this.filterAtivo,
      page_size: 500,
      ordering: 'codigo_produto_fornecedor',
    }).subscribe({
      next: res => {
        this.vinculos = this.unwrap<ProdutoFornecedor>(res);
        this.selected = null;
        this.loading = false;
        this.errorMsg = '';
      },
      error: err => {
        this.vinculos = [];
        this.loading = false;
        this.errorMsg = this.errorText(err, 'Falha ao carregar produtos por fornecedor.');
      },
    });
  }

  novo(): void {
    this.editando = null;
    this.selected = null;
    this.form.reset({
      fornecedor: null,
      codigo_produto_fornecedor: '',
      descricao_fornecedor: '',
      gtin_ean: '',
      produto: null,
      unidade_fornecedor: '',
      fator_conversao: 1,
      ativo: true,
    });
  }

  editar(row: ProdutoFornecedor): void {
    this.editando = row;
    this.selected = row;
    this.form.reset({
      fornecedor: row.fornecedor,
      codigo_produto_fornecedor: row.codigo_produto_fornecedor,
      descricao_fornecedor: row.descricao_fornecedor || '',
      gtin_ean: row.gtin_ean || '',
      produto: row.produto,
      unidade_fornecedor: row.unidade_fornecedor || '',
      fator_conversao: Number(row.fator_conversao || 1),
      ativo: row.ativo,
    });
  }

  salvar(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    const payload: ProdutoFornecedorPayload = {
      fornecedor: Number(raw.fornecedor),
      codigo_produto_fornecedor: String(raw.codigo_produto_fornecedor || '').trim(),
      descricao_fornecedor: this.blankToNull(raw.descricao_fornecedor),
      gtin_ean: this.blankToNull(raw.gtin_ean),
      produto: Number(raw.produto),
      unidade_fornecedor: String(raw.unidade_fornecedor || '').trim().toUpperCase(),
      fator_conversao: String(raw.fator_conversao),
      ativo: !!raw.ativo,
    };
    this.saving = true;
    const req = this.editando?.id ? this.api.update(this.editando.id, payload) : this.api.create(payload);
    req.subscribe({
      next: saved => {
        this.saving = false;
        this.successMsg = 'Vínculo salvo.';
        this.editando = saved;
        this.load();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.errorText(err, 'Falha ao salvar vínculo.');
      },
    });
  }

  alternarAtivo(row: ProdutoFornecedor): void {
    const req = row.ativo ? this.api.inativar(row.id) : this.api.ativar(row.id);
    req.subscribe({
      next: () => {
        this.successMsg = row.ativo ? 'Vínculo inativado.' : 'Vínculo ativado.';
        this.load();
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao alterar status.'),
    });
  }

  selecionar(row: ProdutoFornecedor): void {
    this.selected = this.selected?.id === row.id ? null : row;
  }

  produtoSelecionado(): Produto | undefined {
    const id = Number(this.form.value.produto || 0);
    return this.produtos.find(p => Number(p.Idproduto) === id);
  }

  unidadeInternaForm(): string {
    const produto = this.produtoSelecionado();
    return this.editando?.produto === produto?.Idproduto
      ? (this.editando?.unidade_interna || '-')
      : (produto?.unidade ? String(produto.unidade) : '-');
  }

  expressao(vinculo?: ProdutoFornecedor | null): string {
    const unidadeFornecedor = vinculo?.unidade_fornecedor || this.form.value.unidade_fornecedor || '-';
    const fator = vinculo?.fator_conversao ?? this.form.value.fator_conversao ?? 1;
    const unidadeInterna = vinculo?.unidade_interna || this.unidadeInternaForm();
    return `1 ${unidadeFornecedor || '-'} = ${this.formatFator(fator)} ${unidadeInterna || '-'}`;
  }

  fornecedorNome(id: number): string {
    return this.fornecedores.find(f => Number(f.id) === Number(id))?.nome_fornecedor || `Fornecedor #${id}`;
  }

  produtoLabel(produto: Produto): string {
    return `${produto.referencia || produto.Idproduto || ''} - ${produto.descricao}`;
  }

  clearSearch(): void {
    this.search = '';
    this.filterFornecedor = '';
    this.filterCodigo = '';
    this.filterAtivo = 'true';
    this.load();
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private blankToNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private formatFator(value: string | number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(Number(value || 0));
  }

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
