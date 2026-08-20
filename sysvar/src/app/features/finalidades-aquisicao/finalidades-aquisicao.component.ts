import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequisicaoFinalidadeAquisicao } from '../../core/models/requisicao';
import { RequisicoesService } from '../../core/services/requisicoes.service';

@Component({
  selector: 'app-finalidades-aquisicao',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './finalidades-aquisicao.component.html',
  styleUrls: ['../setores/setores.component.css'],
})
export class FinalidadesAquisicaoComponent implements OnInit {
  private api = inject(RequisicoesService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  rows: RequisicaoFinalidadeAquisicao[] = [];
  selected: RequisicaoFinalidadeAquisicao | null = null;
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
    comportamento: ['USO_CONSUMO', Validators.required],
    ativo: [true],
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.loading = true;
    const params: any = {};
    if (this.search.trim()) params.search = this.search.trim();
    if (this.ativo) params.ativo = this.ativo;
    this.api.listarFinalidadesAquisicao(params).subscribe({
      next: resp => {
        this.rows = this.arrayOrResults<RequisicaoFinalidadeAquisicao>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao carregar finalidades.').join(' ');
      },
    });
  }

  novo(): void {
    this.showForm = true;
    this.consultando = false;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ nome: '', descricao: '', comportamento: 'USO_CONSUMO', ativo: true });
    this.form.enable();
  }

  consultar(row: RequisicaoFinalidadeAquisicao): void { this.abrir(row, true); }
  editar(row: RequisicaoFinalidadeAquisicao): void { this.abrir(row, false); }

  abrir(row: RequisicaoFinalidadeAquisicao, consulta: boolean): void {
    this.selected = row;
    this.showForm = true;
    this.consultando = consulta;
    this.editingId = row.id;
    this.submitted = false;
    this.form.reset({ nome: row.nome, descricao: row.descricao || '', comportamento: row.comportamento, ativo: row.ativo !== false });
    consulta ? this.form.disable() : this.form.enable();
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.consultando) return;
    this.saving = true;
    const payload = this.form.getRawValue() as Partial<RequisicaoFinalidadeAquisicao>;
    const req = this.editingId ? this.api.atualizarFinalidadeAquisicao(this.editingId, payload) : this.api.criarFinalidadeAquisicao(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMsg = this.editingId ? 'Finalidade atualizada.' : 'Finalidade criada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao salvar finalidade.').join(' ');
      },
    });
  }

  alternarAtivo(row: RequisicaoFinalidadeAquisicao): void {
    const req = row.ativo === false ? this.api.ativarFinalidadeAquisicao(row.id) : this.api.inativarFinalidadeAquisicao(row.id);
    req.subscribe({
      next: () => {
        this.successMsg = row.ativo === false ? 'Finalidade ativada.' : 'Finalidade inativada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao alterar status da finalidade.').join(' '),
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.consultando = false;
    this.editingId = null;
  }

  selecionar(row: RequisicaoFinalidadeAquisicao): void { this.selected = row; }
  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }
  statusLabel(row: RequisicaoFinalidadeAquisicao): string { return row.ativo === false ? 'Inativo' : 'Ativo'; }

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
