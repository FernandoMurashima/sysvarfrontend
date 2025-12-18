import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FuncionariosService } from '../../core/services/funcionarios.service';
import { LojasService } from '../../core/services/lojas.service';
import { Funcionario } from '../../core/models/funcionario';
import { Loja } from '../../core/models/loja';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './funcionarios.component.html',
  styleUrls: ['./funcionarios.component.css']
})
export class FuncionariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FuncionariosService);
  private lojasApi = inject(LojasService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  lojasOptions: { id: number; nome: string }[] = [];

  form: FormGroup = this.fb.group({
    nomefuncionario: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['',[Validators.maxLength(20)]],
    cpf: ['', [this.cpfValidator]],

    inicio: [''],
    fim: [''],

    categoria: ['', [Validators.maxLength(15)]],
    meta: [0, []],

    idloja: [null],
    ativo: [true],
  });

  // Lista + paginação client-side
  funcionariosAll: Funcionario[] = [];
  funcionarios: Funcionario[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get pageStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  ngOnInit(): void {
    this.load();
    this.loadLojas();
  }

  loadLojas(): void {
    this.lojasApi.list({ page_size: 2000, ordering: 'nome_loja' }).subscribe({
      next: (res: any) => {
        const arr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.lojasOptions = arr.map(l => ({ id: (l as any).Idloja ?? (l as any).id ?? (l as any).pk ?? 0, nome: l.nome_loja }));
      },
      error: () => { this.lojasOptions = []; }
    });
  }

  // ====== Validadores / formatações ======
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString().trim();
    if (!raw) return null; // opcional
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 11) return { cpf: true };
    // rejeita sequências
    if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

    const calc = (base: string, factorStart: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factorStart - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    const d1 = calc(digits.slice(0, 9), 10);
    const d2 = calc(digits.slice(0,10), 11);
    const ok = (d1 === parseInt(digits[9],10)) && (d2 === parseInt(digits[10],10));
    return ok ? null : { cpf: true };
  }

  onCpfInput(): void {
    const ctrl = this.form.get('cpf');
    if (!ctrl) return;
    const d = (ctrl.value || '').toString().replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 3) out = d.slice(0,3) + '.' + d.slice(3);
    if (d.length > 6) out = out.slice(0,7) + '.' + d.slice(6);
    if (d.length > 9) out = out.slice(0,11) + '-' + d.slice(9);
    ctrl.setValue(out, { emitEvent: false });
  }

  // ========= Ações =========
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000, ordering: 'nomefuncionario' }).subscribe({
      next: (res: any) => {
        const arr: Funcionario[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.funcionariosAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.funcionariosAll = [];
        this.funcionarios = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar funcionários.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.funcionarios = this.funcionariosAll.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 10;
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void { if (ev.key === 'Enter') this.doSearch(); }
  doSearch(): void { this.page = 1; this.load(); }
  clearSearch(): void { this.search = ''; this.page = 1; this.load(); }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nomefuncionario: '',
      apelido: '',
      cpf: '',
      inicio: '',
      fim: '',
      categoria: '',
      meta: 0,
      idloja: null,
      ativo: true,
    });
  }

  editar(row: Funcionario): void {
    this.showForm = true;
    this.editingId = (row as any).id ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nomefuncionario: row.nomefuncionario ?? '',
      apelido: row.apelido ?? '',
      cpf: row.cpf ?? '',
      inicio: row.inicio ?? '',
      fim: row.fim ?? '',
      categoria: row.categoria ?? '',
      meta: row.meta ?? 0,
      idloja: (row as any).idloja ?? null,
      ativo: row.ativo ?? true,
    });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
  }

  salvar(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    // normalizações simples
    const raw = this.form.value;
    const payload: Funcionario = {
      ...raw,
      meta: raw.meta === '' || raw.meta === null ? 0 : Number(raw.meta),
      idloja: raw.idloja === '' ? null : raw.idloja,
      inicio: raw.inicio ? raw.inicio : null as any,
      fim: raw.fim ? raw.fim : null as any,
      cpf: raw.cpf ? String(raw.cpf) : null as any,
    };

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas.' : 'Funcionário criado.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';
        if (err?.error && typeof err.error === 'object') {
          Object.keys(err.error).forEach(field => {
            const ctrl = this.form.get(field);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(err.error[field]) ? err.error[field].join(' ') : String(err.error[field])
              });
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Funcionario): void {
    const id = (item as any).id;
    if (!id) return;
    if (!confirm(`Excluir o funcionário "${item.nomefuncionario}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Funcionário excluído.';
        const eraUltimo = this.funcionarios.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: () => { this.errorMsg = 'Falha ao excluir.'; }
    });
  }

  // Overlay de erros
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nomefuncionario')?.hasError('required') || false, 'Nome é obrigatório.');
    P(f.get('nomefuncionario')?.hasError('maxlength') || false, 'Nome: máx. 50 caracteres.');
    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 20 caracteres.');
    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');
    P(f.get('categoria')?.hasError('maxlength') || false, 'Categoria: máx. 15 caracteres.');

    ['nomefuncionario','apelido','cpf','inicio','fim','categoria','meta','idloja','ativo']
      .forEach(field => {
        const err = f.get(field)?.errors?.['server'];
        if (err) msgs.push(`${field}: ${err}`);
      });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }
}
