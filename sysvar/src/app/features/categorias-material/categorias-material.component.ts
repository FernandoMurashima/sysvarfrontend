import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequisicaoMaterialCategoria } from '../../core/models/requisicao';
import { RequisicoesService } from '../../core/services/requisicoes.service';

@Component({
  selector: 'app-categorias-material',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './categorias-material.component.html',
  styleUrls: ['../setores/setores.component.css'],
})
export class CategoriasMaterialComponent implements OnInit {
  private api = inject(RequisicoesService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  rows: RequisicaoMaterialCategoria[] = [];
  selected: RequisicaoMaterialCategoria | null = null;
  editingId: number | null = null;
  consultando = false;
  showForm = false;
  loading = false;
  saving = false;
  submitted = false;
  search = '';
  ativo = '';
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    nome: ['', Validators.required],
    descricao: [''],
    ativo: [true],
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    const params: any = {};
    if (this.search.trim()) params.search = this.search.trim();
    if (this.ativo) params.ativo = this.ativo;
    this.api.listarCategoriasMaterial(params).subscribe({
      next: resp => {
        this.rows = this.arrayOrResults<RequisicaoMaterialCategoria>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao carregar categorias.').join(' ');
      },
    });
  }

  novo(): void {
    this.showForm = true;
    this.consultando = false;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ nome: '', descricao: '', ativo: true });
    this.form.enable();
  }

  consultar(row: RequisicaoMaterialCategoria): void { this.abrir(row, true); }
  editar(row: RequisicaoMaterialCategoria): void { this.abrir(row, false); }

  abrir(row: RequisicaoMaterialCategoria, consulta: boolean): void {
    this.selected = row;
    this.showForm = true;
    this.consultando = consulta;
    this.editingId = row.id;
    this.submitted = false;
    this.form.reset({ nome: row.nome, descricao: row.descricao || '', ativo: row.ativo !== false });
    consulta ? this.form.disable() : this.form.enable();
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.consultando) return;
    this.saving = true;
    const payload = this.form.getRawValue() as Partial<RequisicaoMaterialCategoria>;
    const req = this.editingId ? this.api.atualizarCategoriaMaterial(this.editingId, payload) : this.api.criarCategoriaMaterial(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMsg = this.editingId ? 'Categoria atualizada.' : 'Categoria criada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao salvar categoria.').join(' ');
      },
    });
  }

  alternarAtivo(row: RequisicaoMaterialCategoria): void {
    const req = row.ativo === false ? this.api.ativarCategoriaMaterial(row.id) : this.api.inativarCategoriaMaterial(row.id);
    req.subscribe({
      next: () => {
        this.successMsg = row.ativo === false ? 'Categoria ativada.' : 'Categoria inativada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao alterar status da categoria.').join(' '),
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.consultando = false;
    this.editingId = null;
  }

  selecionar(row: RequisicaoMaterialCategoria): void { this.selected = row; }
  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }
  statusLabel(row: RequisicaoMaterialCategoria): string { return row.ativo === false ? 'Inativo' : 'Ativo'; }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data?.results && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  private extractMessages(err: any, fallback: string): string[] {
    const data = err?.error;
    if (!data) return [fallback];
    if (typeof data === 'string') return [data];
    if (Array.isArray(data)) return data.map(String);
    if (typeof data === 'object') return Object.entries(data).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(v => key === 'detail' ? String(v) : `${key}: ${v}`));
    return [fallback];
  }
}
