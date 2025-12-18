import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FornecedoresService } from '../../core/services/fornecedores.service';
import { Fornecedor } from '../../core/models/fornecedor';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './fornecedores.component.html',
  styleUrls: ['./fornecedores.component.css']
})
export class FornecedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FornecedoresService);

  // ======== Estado UI ========
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  // ======== Form ========
  form: FormGroup = this.fb.group({
    nome_fornecedor: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.maxLength(18)]],
    cnpj: ['', [Validators.required, this.cnpjValidator]],
    email: ['', [Validators.email]],

    logradouro: ['Rua'],
    endereco: [''],
    numero: ['', [Validators.maxLength(10)]],
    complemento: [''],

    cep: [''],
    bairro: [''],
    cidade: [''],
    estado: [''],

    telefone1: ['', [this.phoneValidator]],
    telefone2: ['', [this.phoneValidator]],

    categoria: [''],
    bloqueio: [false],
    mala_direta: [false],
    conta_contabil: [''],

    ativo: [true],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  // ======== Lista + paginação client-side ========
  fornecedoresAll: Fornecedor[] = [];
  fornecedores: Fornecedor[] = [];

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
  }

  // ========= Helpers =========
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '');
  }

  private formatPhone(digits: string): string {
    const d = this.onlyDigits(digits).slice(0, 11);
    if (d.length < 10) return d;
    const ddd = d.slice(0, 2);
    if (d.length === 10) {
      return `(${ddd})-` + d.slice(2, 6) + '-' + d.slice(6, 10);
    }
    return `(${ddd})-` + d.slice(2, 7) + '-' + d.slice(7, 11);
    }

  // ========= Validadores =========
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null; // required cuida do vazio
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };
    const calc = (base: string, factors: number[]) => {
      const sum = base.split('')
        .map((n, i) => parseInt(n, 10) * factors[i])
        .reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const base13 = base12 + d1;
    const d2 = calc(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    const ok = digits === (base12 + String(d1) + String(d2));
    return ok ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{4,5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  onPhoneInput(field: 'telefone1'|'telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    const masked = this.formatPhone(ctrl.value);
    ctrl.setValue(masked, { emitEvent: false });
  }

  // ========= Fluxo =========
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Fornecedor[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.fornecedoresAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number')
          ? res.count
          : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.fornecedoresAll = [];
        this.fornecedores = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar fornecedores.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.fornecedores = this.fornecedoresAll.slice(start, end);
  }

  onPageSizeChange(sizeStr: string): void {
    const size = Number(sizeStr) || 10;
    this.pageSize = size;
    this.page = 1;
    this.applyPage();
  }
  firstPage(): void { if (this.page !== 1) { this.page = 1; this.applyPage(); } }
  prevPage(): void  { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void  { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void  { if (this.page !== this.totalPages) { this.page = this.totalPages; this.applyPage(); } }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }
  doSearch(): void {
    this.page = 1;
    this.load();
  }
  clearSearch(): void {
    this.search = '';
    this.page = 1;
    this.load();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nome_fornecedor: '',
      apelido: '',
      cnpj: '',
      email: '',

      logradouro: 'Rua',
      endereco: '',
      numero: '',
      complemento: '',

      cep: '',
      bairro: '',
      cidade: '',
      estado: '',

      telefone1: '',
      telefone2: '',

      categoria: '',
      bloqueio: false,
      mala_direta: false,
      conta_contabil: '',

      ativo: true,
    });
  }

  editar(row: Fornecedor): void {
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    const t1 = this.formatPhone(row.telefone1 ?? '');
    const t2 = this.formatPhone(row.telefone2 ?? '');

    this.form.reset({
      nome_fornecedor: row.nome_fornecedor ?? '',
      apelido:        row.apelido ?? '',
      cnpj:           row.cnpj ?? '',
      email:          row.email ?? '',

      logradouro:     row.logradouro ?? 'Rua',
      endereco:       row.endereco ?? '',
      numero:         row.numero ?? '',
      complemento:    row.complemento ?? '',

      cep:            row.cep ?? '',
      bairro:         row.bairro ?? '',
      cidade:         row.cidade ?? '',
      estado:         row.estado ?? '',

      telefone1:      t1,
      telefone2:      t2,

      categoria:      row.categoria ?? '',
      bloqueio:       !!row.bloqueio,
      mala_direta:    !!row.mala_direta,
      conta_contabil: row.conta_contabil ?? '',

      ativo:          row.ativo ?? true,
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

    const raw = this.form.value;

    const payload: Fornecedor = {
      ...raw,
      cnpj: this.onlyDigits(raw.cnpj),
      telefone1: this.onlyDigits(raw.telefone1),
      telefone2: this.onlyDigits(raw.telefone2),
    };

    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId
          ? 'Alterações salvas com sucesso.'
          : 'Fornecedor criado com sucesso.';
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

  excluir(item: Fornecedor): void {
    const id = item.id;
    if (!id) return;
    if (!confirm(`Excluir o fornecedor "${item.nome_fornecedor}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Fornecedor excluído.';
        const eraUltimo = this.fornecedores.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Falha ao excluir.';
      }
    });
  }

  // ========= Overlay de erros =========
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('nome_fornecedor')?.hasError('required') || false, 'Nome do fornecedor é obrigatório.');
    P(f.get('nome_fornecedor')?.hasError('maxlength') || false, 'Nome do fornecedor: máx. 50 caracteres.');

    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('cnpj')?.hasError('required') || false, 'CNPJ é obrigatório.');
    P(f.get('cnpj')?.hasError('cnpj') || false, 'CNPJ inválido.');

    P(f.get('email')?.hasError('email') || false, 'Email inválido.');
    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-9999-9999 ou (99)-99999-9999.');
    P(f.get('telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-9999-9999 ou (99)-99999-9999.');

    // erros do backend
    [
      'nome_fornecedor','apelido','cnpj','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'categoria','bloqueio','mala_direta','conta_contabil',
      'ativo'
    ].forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err) msgs.push(`${field}: ${err}`);
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    const has = this.getFormErrors().length > 0;
    this.errorOverlayOpen = has;
  }
  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }
}
