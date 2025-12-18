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
import { ClientesService } from '../../core/services/clientes.service';
import { Cliente } from '../../core/models/clientes';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ClientesService);

  // ======== Estado geral UI ========
  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  // ======== Formulário ========
  form: FormGroup = this.fb.group({
    nome_cliente: ['', [Validators.required, Validators.maxLength(50)]],
    apelido: ['', [Validators.maxLength(18)]],
    cpf: ['', [this.cpfValidator]],

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
    aniversario: [''],         // será convertido para null se vazio

    bloqueio: [false],
    mala_direta: [false],
    ativo: [true],

    conta_contabil: [''],
  });

  logradouroOptions: string[] = [
    'Rua','Avenida','Travessa','Alameda','Praça','Rodovia','Estrada','Largo','Viela'
  ];

  // ======== Lista + ListView (client-side) ========
  clientesAll: Cliente[] = [];
  clientes: Cliente[] = [];

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

  // ========= Helpers de telefone =========

  /** Mantém só dígitos (até 11) */
  private onlyDigits(v: any): string {
    return (v ?? '').toString().replace(/\D/g, '').slice(0, 11);
  }

  /** Formata dígitos em (99)-9999-9999 ou (99)-99999-9999 */
  private formatPhone(digits: string): string {
    const d = this.onlyDigits(digits);
    if (d.length < 10) return d; // deixa como está enquanto digita
    const ddd = d.slice(0, 2);
    if (d.length === 10) {
      // fixo: 4+4
      return `(${ddd})-` + d.slice(2, 6) + '-' + d.slice(6, 10);
    }
    // móvel: 5+4
    return `(${ddd})-` + d.slice(2, 7) + '-' + d.slice(7, 11);
  }

  // ========= Validadores =========

  /** CPF: aceita vazio; se houver valor, exige 11 dígitos válidos com DV */
  cpfValidator(ctrl: AbstractControl): ValidationErrors | null {
    const raw = (ctrl.value || '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 11) return { cpf: true };
    if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

    const calc = (base: string, facIni: number) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (facIni - i);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const d1 = calc(digits.substring(0, 9), 10);
    const d2 = calc(digits.substring(0, 10), 11);
    const ok = digits === digits.substring(0, 9) + String(d1) + String(d2);
    return ok ? null : { cpf: true };
  }

  /** Telefone simples: valida máscara (99)-9999-9999 ou (99)-99999-9999 */
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

  // ========= Ações / Fluxo =========

  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000 }).subscribe({
      next: (res: any) => {
        const arr: Cliente[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.clientesAll = arr;
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
        this.clientesAll = [];
        this.clientes = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar clientes.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.clientes = this.clientesAll.slice(start, end);
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

  // Buscar / limpar
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

  // Novo / Editar
  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      nome_cliente: '',
      apelido: '',
      cpf: '',
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
      aniversario: '',

      bloqueio: false,
      mala_direta: false,
      ativo: true,

      conta_contabil: '',
    });
  }

  editar(row: Cliente): void {
    this.showForm = true;
    this.editingId = row.id ?? null;
    this.submitted = false;
       this.successMsg = '';
    this.errorMsg = '';

    // Formatar telefones vindos como dígitos do backend
    const t1 = this.formatPhone(row.telefone1 ?? '');
    const t2 = this.formatPhone(row.telefone2 ?? '');

    this.form.reset({
      nome_cliente:   row.nome_cliente ?? '',
      apelido:        row.apelido ?? '',
      cpf:            row.cpf ?? '',
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
      aniversario:    row.aniversario ?? '',

      bloqueio:       !!row.bloqueio,
      mala_direta:    !!row.mala_direta,
      ativo:          row.ativo ?? true,

      conta_contabil: row.conta_contabil ?? '',
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

    // Remover máscara antes de enviar (backend espera só dígitos)
    const payload: Cliente = {
      ...raw,
      telefone1: this.onlyDigits(raw.telefone1),
      telefone2: this.onlyDigits(raw.telefone2),
      aniversario: raw.aniversario ? raw.aniversario : null,
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
          : 'Cliente criado com sucesso.';
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

  excluir(item: Cliente): void {
    const id = item.id;
    if (!id) return;
    if (!confirm(`Excluir o cliente "${item.nome_cliente}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Cliente excluído.';
        const eraUltimo = this.clientes.length === 1 && this.page > 1;
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

    P(f.get('nome_cliente')?.hasError('required') || false, 'Nome do cliente é obrigatório.');
    P(f.get('nome_cliente')?.hasError('maxlength') || false, 'Nome do cliente: máx. 50 caracteres.');

    P(f.get('apelido')?.hasError('maxlength') || false, 'Apelido: máx. 18 caracteres.');

    P(f.get('cpf')?.hasError('cpf') || false, 'CPF inválido.');
    P(f.get('email')?.hasError('email') || false, 'Email inválido.');

    P(f.get('numero')?.hasError('maxlength') || false, 'Número: máx. 10 caracteres.');

    P(f.get('telefone1')?.hasError('phone') || false, 'Telefone 1: formato (99)-9999-9999 ou (99)-99999-9999.');
    P(f.get('telefone2')?.hasError('phone') || false, 'Telefone 2: formato (99)-9999-9999 ou (99)-99999-9999.');

    // erros vindos do backend
    [
      'nome_cliente','apelido','cpf','email',
      'logradouro','endereco','numero','complemento',
      'cep','bairro','cidade','estado',
      'telefone1','telefone2',
      'categoria','aniversario',
      'bloqueio','mala_direta','ativo',
      'conta_contabil'
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
