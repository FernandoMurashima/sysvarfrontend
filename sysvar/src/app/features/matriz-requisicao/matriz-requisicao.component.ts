import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequisicaoMatrizResponsabilidade, RequisicaoSetor, RequisicaoTipo } from '../../core/models/requisicao';
import { RequisicoesService } from '../../core/services/requisicoes.service';

@Component({
  selector: 'app-matriz-requisicao',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './matriz-requisicao.component.html',
  styleUrls: ['../setores/setores.component.css'],
})
export class MatrizRequisicaoComponent implements OnInit {
  private api = inject(RequisicoesService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  rows: RequisicaoMatrizResponsabilidade[] = [];
  setores: RequisicaoSetor[] = [];
  selected: RequisicaoMatrizResponsabilidade | null = null;
  editingId: number | null = null;
  showForm = false;
  consultando = false;
  loading = false;
  saving = false;
  submitted = false;
  ativo = 'true';
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    tipo_requisicao: ['USO_CONSUMO' as RequisicaoTipo, Validators.required],
    setor_atendimento: [null as number | null, Validators.required],
    setor_aquisicao: [null as number | null, Validators.required],
    ativo: [true],
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  ngOnInit(): void {
    this.carregar();
    this.api.listarSetoresAdmin({ ativo: 'true' }).subscribe(resp => this.setores = this.arrayOrResults<RequisicaoSetor>(resp));
  }

  carregar(): void {
    this.loading = true;
    const params: any = {};
    if (this.ativo) params.ativo = this.ativo;
    this.api.listarMatrizResponsabilidade(params).subscribe({
      next: resp => {
        this.rows = this.arrayOrResults<RequisicaoMatrizResponsabilidade>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao carregar matriz.').join(' ');
      },
    });
  }

  novo(): void {
    this.showForm = true;
    this.consultando = false;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ tipo_requisicao: 'USO_CONSUMO', setor_atendimento: null, setor_aquisicao: null, ativo: true });
    this.form.enable();
  }

  consultar(row: RequisicaoMatrizResponsabilidade): void { this.abrir(row, true); }
  editar(row: RequisicaoMatrizResponsabilidade): void { this.abrir(row, false); }

  abrir(row: RequisicaoMatrizResponsabilidade, consulta: boolean): void {
    this.selected = row;
    this.showForm = true;
    this.consultando = consulta;
    this.editingId = row.id;
    this.submitted = false;
    this.form.reset({
      tipo_requisicao: row.tipo_requisicao,
      setor_atendimento: row.setor_atendimento,
      setor_aquisicao: row.setor_aquisicao,
      ativo: row.ativo !== false,
    });
    consulta ? this.form.disable() : this.form.enable();
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.consultando) return;
    this.saving = true;
    const payload = this.form.getRawValue() as Partial<RequisicaoMatrizResponsabilidade>;
    const req = this.editingId ? this.api.atualizarMatrizResponsabilidade(this.editingId, payload) : this.api.criarMatrizResponsabilidade(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMsg = this.editingId ? 'Matriz atualizada.' : 'Matriz criada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao salvar matriz.').join(' ');
      },
    });
  }

  alternarAtivo(row: RequisicaoMatrizResponsabilidade): void {
    const req = row.ativo === false ? this.api.ativarMatrizResponsabilidade(row.id) : this.api.inativarMatrizResponsabilidade(row.id);
    req.subscribe({
      next: () => {
        this.successMsg = row.ativo === false ? 'Matriz ativada.' : 'Matriz inativada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao alterar status da matriz.').join(' '),
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.consultando = false;
    this.editingId = null;
  }

  selecionar(row: RequisicaoMatrizResponsabilidade): void { this.selected = row; }

  tipoLabel(tipo: string): string {
    return { USO_CONSUMO: 'Uso e Consumo', MANUTENCAO: 'Manutenção', TI: 'TI' }[tipo] || tipo;
  }

  statusLabel(row: RequisicaoMatrizResponsabilidade): string { return row.ativo === false ? 'Inativo' : 'Ativo'; }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

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
    if (typeof data === 'object') {
      const out: string[] = [];
      Object.entries(data).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach(v => out.push(key === 'detail' ? String(v) : `${key}: ${v}`));
      });
      return out.length ? out : [fallback];
    }
    return [fallback];
  }
}
