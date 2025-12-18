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
import { LojasService } from '../../core/services/lojas.service';
import { Loja } from '../../core/models/loja';

@Component({
  selector: 'app-lojas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './lojas.component.html',
  styleUrls: ['./lojas.component.css']
})
export class LojasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(LojasService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  form: FormGroup = this.fb.group({
    nome_loja: ['', [Validators.required, Validators.maxLength(50)]],
    apelido_loja: ['', [Validators.required, Validators.maxLength(20)]],
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

    // novos no form (mantemos nomes já usados no HTML)
    conta_contabil: [''],
    DataAbertura: [''],
    DataEnceramento: [''],
    EstoqueNegativo: ['NAO'],
    Rede: ['NAO'],
    Matriz: ['NAO'],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  lojasAll: Loja[] = [];
  lojas: Loja[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { if (this.total === 0) return 0; return (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  ngOnInit(): void { this.load(); }

  // ===== Helpers =====
  private formatPhone(v?: string | null): string {
    const d = (v || '').replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    if (rest.length <= 8) {
      const p1 = rest.slice(0, Math.min(4, rest.length));
      const p2 = rest.slice(4, 8);
      return p2 ? `(${ddd})-${p1}-${p2}` : `(${ddd})-${p1}`;
    } else {
      const p1 = rest.slice(0, 5);
      const p2 = rest.slice(5, 9);
      return p2 ? `(${ddd})-${p1}-${p2}` : `(${ddd})-${p1}`;
    }
  }

  private blankToNull<T extends string | null | undefined>(v: T): string | null {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }

  // ====== Validators ======
  cnpjValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw: string = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1{13}$/.test(digits)) return { cnpj: true };
    const calc = (base: string, factors: number[]) => {
      const sum = base.split('').map((n, i) => parseInt(n, 10) * factors[i]).reduce((a, b) => a + b, 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const base12 = digits.slice(0, 12);
    const d1 = calc(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const base13 = base12 + d1;
    const d2 = calc(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return digits === (base12 + String(d1) + String(d2)) ? null : { cnpj: true };
  }

  phoneValidator(ctrl: AbstractControl): ValidationErrors | null {
    const v: string = (ctrl.value || '').toString().trim();
    if (!v) return null;
    const ok = /^\(\d{2}\)-\d{4}-\d{4}$/.test(v) || /^\(\d{2}\)-\d{5}-\d{4}$/.test(v);
    return ok ? null : { phone: true };
  }

  onPhoneInput(field: 'telefone1'|'telefone2'): void {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    ctrl.setValue(this.formatPhone(ctrl.value), { emitEvent: false });
  }

  // ====== Fluxo ======
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const rawArr: Loja[] = Array.isArray(res) ? res : (res?.results ?? []);
        const arr = rawArr.map(item => ({
          ...item,
          // compat de apelido
          apelido_loja: item.apelido_loja ?? (item as any).Apelido_loja ?? '',
          // mascarar telefones vindos só com dígitos
          telefone1: this.formatPhone(item.telefone1),
          telefone2: this.formatPhone(item.telefone2),
          // mapear ContaContabil (backend) -> conta_contabil (form/UI)
          conta_contabil: (item as any).conta_contabil ?? (item as any).ContaContabil ?? '',
        })) as Loja[];
        this.lojasAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number') ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.lojasAll = [];
        this.lojas = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar lojas.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.lojas = this.lojasAll.slice(start, end);
  }
  onPageSizeChange(sizeStr: string): void { this.pageSize = Number(sizeStr) || 10; this.page = 1; this.applyPage(); }
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
      nome_loja: '',
      apelido_loja: '',
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
      conta_contabil: '',
      DataAbertura: '',
      DataEnceramento: '',
      EstoqueNegativo: 'NAO',
      Rede: 'NAO',
      Matriz: 'NAO',
    });
  }

  editar(row: Loja): void {
    this.showForm = true;
    this.editingId = (row as any).id ?? (row as any).Idloja ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nome_loja:    row.nome_loja ?? '',
      apelido_loja: (row as any).apelido_loja ?? (row as any).Apelido_loja ?? '',
      cnpj:         row.cnpj ?? '',
      email:        row.email ?? '',
      logradouro:   row.logradouro ?? 'Rua',
      endereco:     row.endereco ?? '',
      numero:       row.numero ?? '',
      complemento:  row.complemento ?? '',
      cep:          row.cep ?? '',
      bairro:       row.bairro ?? '',
      cidade:       row.cidade ?? '',
      estado:       (row as any).estado ?? '',
      telefone1:    this.formatPhone(row.telefone1),
      telefone2:    this.formatPhone(row.telefone2),

      // novos
      conta_contabil: (row as any).conta_contabil ?? (row as any).ContaContabil ?? '',
      DataAbertura:   (row as any).DataAbertura ?? '',
      DataEnceramento:(row as any).DataEnceramento ?? '',
      EstoqueNegativo:(row as any).EstoqueNegativo ?? 'NAO',
      Rede:           (row as any).Rede ?? 'NAO',
      Matriz:         (row as any).Matriz ?? 'NAO',
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
    if (this.form.invalid) { this.openErrorOverlayIfNeeded(); return; }

    const f = this.form.value as any;
    const apelido = (f.apelido_loja || '').toString().trim();

    // datas: '' -> null (DRF aceita null para DateField nullable)
    const dataAbertura = this.blankToNull(f.DataAbertura);
    const dataEnceramento = this.blankToNull(f.DataEnceramento);

    const payload: any = {
      nome_loja: (f.nome_loja || '').toString().trim(),
      cnpj: (f.cnpj || '').toString().trim(),

      // apelido nas duas chaves (compat)
      Apelido_loja: apelido,
      apelido_loja: apelido,

      email: this.blankToNull(f.email),
      logradouro: this.blankToNull(f.logradouro),
      endereco: this.blankToNull(f.endereco),
      numero: this.blankToNull(f.numero),
      complemento: this.blankToNull(f.complemento),
      cep: this.blankToNull(f.cep),
      bairro: this.blankToNull(f.bairro),
      cidade: this.blankToNull(f.cidade),
      estado: this.blankToNull(f.estado),

      telefone1: this.blankToNull(f.telefone1),
      telefone2: this.blankToNull(f.telefone2),

      // **novos campos com NOME EXATO DO BACKEND**
      EstoqueNegativo: this.blankToNull(f.EstoqueNegativo),
      Rede: this.blankToNull(f.Rede),
      Matriz: this.blankToNull(f.Matriz),
      DataAbertura: dataAbertura,
      DataEnceramento: dataEnceramento,
      ContaContabil: this.blankToNull(f.conta_contabil),
    };

    this.saving = true;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId ? 'Alterações salvas com sucesso.' : 'Loja criada com sucesso.';
        this.cancelarEdicao();
        this.page = 1;
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.successMsg = '';

        const serverErrors = err?.error && typeof err.error === 'object' ? err.error : null;
        if (serverErrors) {
          const mapToCtrl = (apiField: string) => {
            if (apiField === 'Apelido_loja' || apiField === 'apelido_loja') return 'apelido_loja';
            if (apiField === 'ContaContabil') return 'conta_contabil';
            return apiField;
          };
          const seen = new Set<string>();
          Object.keys(serverErrors).forEach(apiField => {
            const ctrlName = mapToCtrl(apiField);
            if (seen.has(ctrlName)) return;
            const ctrl = this.form.get(ctrlName);
            if (ctrl) {
              ctrl.setErrors({
                ...(ctrl.errors || {}),
                server: Array.isArray(serverErrors[apiField]) ? serverErrors[apiField].join(' ') : String(serverErrors[apiField])
              });
              seen.add(ctrlName);
            }
          });
        }
        this.openErrorOverlayIfNeeded();
      }
    });
  }

  excluir(item: Loja): void {
    const id = (item as any).id ?? (item as any).Idloja;
    if (!id) return;
    if (!confirm(`Excluir a loja "${item.nome_loja}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Loja excluída.';
        const eraUltimo = this.lojas.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: () => { this.errorMsg = 'Falha ao excluir.'; }
    });
  }

  // ====== Overlay de erros ======
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const push = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };

    push(f.get('nome_loja')?.hasError('required') || false, 'nome_loja: Este campo é obrigatório.');
    push(f.get('nome_loja')?.hasError('maxlength') || false, 'nome_loja: Máx. 50 caracteres.');
    push(f.get('apelido_loja')?.hasError('required') || false, 'apelido_loja: Este campo é obrigatório.');
    push(f.get('apelido_loja')?.hasError('maxlength') || false, 'apelido_loja: Máx. 20 caracteres.');
    push(f.get('cnpj')?.hasError('required') || false, 'cnpj: Este campo é obrigatório.');
    push(f.get('cnpj')?.hasError('cnpj') || false, 'cnpj: CNPJ inválido.');
    push(f.get('email')?.hasError('email') || false, 'email: Email inválido.');
    push(f.get('numero')?.hasError('maxlength') || false, 'numero: Máx. 10 caracteres.');
    push(f.get('telefone1')?.hasError('phone') || false, 'telefone1: Formato (99)-9999-9999 ou (99)-99999-9999.');
    push(f.get('telefone2')?.hasError('phone') || false, 'telefone2: Formato (99)-9999-9999 ou (99)-99999-9999.');

    const fields = [
      'nome_loja','apelido_loja','cnpj','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'conta_contabil','DataAbertura','DataEnceramento',
      'EstoqueNegativo','Rede','Matriz'
    ];
    const seen = new Set<string>();
    fields.forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err && !seen.has(field)) { msgs.push(`${field}: ${err}`); seen.add(field); }
    });

    return msgs;
  }

  openErrorOverlayIfNeeded(): void { this.errorOverlayOpen = this.getFormErrors().length > 0; }
  closeErrorOverlay(): void { this.errorOverlayOpen = false; }
}
