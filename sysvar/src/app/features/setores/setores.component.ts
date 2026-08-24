import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequisicaoSetor } from '../../core/models/requisicao';
import { RequisicoesService } from '../../core/services/requisicoes.service';

@Component({
  selector: 'app-setores',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './setores.component.html',
  styleUrls: ['./setores.component.css'],
})
export class SetoresComponent implements OnInit {
  private api = inject(RequisicoesService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  setores: RequisicaoSetor[] = [];
  lojas: { id: number; label: string }[] = [];
  filtered: RequisicaoSetor[] = [];
  selected: RequisicaoSetor | null = null;
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
    loja: [null as number | null],
    descricao: [''],
    ativo: [true],
    pode_fazer_requisicao: [true],
    recebe_requisicoes: [true],
    central_uso_consumo: [false],
    central_manutencao: [false],
    central_ti: [false],
    responsavel_compras: [false],
    controla_estoque_uso_consumo: [false],
  });

  get podeEditarModulo(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  ngOnInit(): void {
    this.carregar();
    this.api.lojasPermitidas().subscribe(resp => {
      this.lojas = this.arrayOrResults<any>(resp).map(l => ({ id: Number(l.id ?? l.Idloja), label: l.nome_loja || l.apelido_loja || String(l.id ?? l.Idloja) })).filter(l => !!l.id);
    });
  }

  carregar(): void {
    this.loading = true;
    const params: any = {};
    if (this.search.trim()) params.search = this.search.trim();
    if (this.ativo) params.ativo = this.ativo;
    this.api.listarSetoresAdmin(params).subscribe({
      next: resp => {
        this.setores = this.arrayOrResults<RequisicaoSetor>(resp);
        this.filtered = this.setores;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao carregar setores.').join(' ');
      },
    });
  }

  novo(): void {
    this.showForm = true;
    this.consultando = false;
    this.editingId = null;
    this.submitted = false;
    this.form.reset({ nome: '', loja: null, descricao: '', ativo: true, pode_fazer_requisicao: true, recebe_requisicoes: true, central_uso_consumo: false, central_manutencao: false, central_ti: false, responsavel_compras: false, controla_estoque_uso_consumo: false });
    this.form.enable();
  }

  consultar(row: RequisicaoSetor): void {
    this.abrir(row, true);
  }

  editar(row: RequisicaoSetor): void {
    this.abrir(row, false);
  }

  abrir(row: RequisicaoSetor, consulta: boolean): void {
    this.selected = row;
    this.showForm = true;
    this.consultando = consulta;
    this.editingId = row.id;
    this.submitted = false;
    this.form.reset({
      nome: row.nome,
      loja: row.loja || null,
      descricao: row.descricao || '',
      ativo: row.ativo !== false,
      pode_fazer_requisicao: row.pode_fazer_requisicao !== false,
      recebe_requisicoes: row.recebe_requisicoes !== false,
      central_uso_consumo: row.central_uso_consumo === true,
      central_manutencao: row.central_manutencao === true,
      central_ti: row.central_ti === true,
      responsavel_compras: row.responsavel_compras === true,
      controla_estoque_uso_consumo: row.controla_estoque_uso_consumo === true,
    });
    consulta ? this.form.disable() : this.form.enable();
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid || this.consultando) return;
    this.saving = true;
    const payload = this.form.getRawValue() as Partial<RequisicaoSetor>;
    const req = this.editingId ? this.api.atualizarSetor(this.editingId, payload) : this.api.criarSetor(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMsg = this.editingId ? 'Setor atualizado.' : 'Setor criado.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao salvar setor.').join(' ');
      },
    });
  }

  alternarAtivo(row: RequisicaoSetor): void {
    const req = row.ativo === false ? this.api.ativarSetor(row.id) : this.api.inativarSetor(row.id);
    req.subscribe({
      next: () => {
        this.successMsg = row.ativo === false ? 'Setor ativado.' : 'Setor inativado.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao alterar status do setor.').join(' '),
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.consultando = false;
    this.editingId = null;
  }

  selecionar(row: RequisicaoSetor): void {
    this.selected = row;
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  statusLabel(row: RequisicaoSetor): string {
    return row.ativo === false ? 'Inativo' : 'Ativo';
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
