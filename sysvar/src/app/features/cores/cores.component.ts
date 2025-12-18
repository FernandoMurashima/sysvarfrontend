import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CoresService } from '../../core/services/cores.service';
import { Cor } from '../../core/models/cor';

@Component({
  selector: 'app-cores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cores.component.html',
  styleUrls: ['./cores.component.css']
})
export class CoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CoresService);

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
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Codigo: ['', [Validators.maxLength(12)]],
    Cor: ['', [Validators.required, Validators.maxLength(30)]],
    Status: ['']
  });

  coresAll: Cor[] = [];
  cores: Cor[] = [];

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

  // --------- Fluxo ---------
  load(): void {
    this.loading = true;
    this.api.list({ search: this.search, page_size: 2000, ordering: 'Descricao' }).subscribe({
      next: (res: any) => {
        const arr: Cor[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.coresAll = arr;
        this.total = (res && typeof res === 'object' && typeof res.count === 'number')
          ? res.count : arr.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: (err) => {
        console.error(err);
        this.coresAll = [];
        this.cores = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar cores.';
      }
    });
  }

  applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.cores = this.coresAll.slice(start, end);
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
      Descricao: '',
      Codigo: '',
      Cor: '',
      Status: ''
    });
  }

  editar(row: Cor): void {
    this.showForm = true;
    this.editingId = (row as any).Idcor ?? null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';

    this.form.reset({
      Descricao:    row.Descricao ?? '',
      Codigo:       row.Codigo ?? '',
      Cor:          row.Cor ?? '',
      Status:       row.Status ?? ''
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

    const payload: Cor = { ...this.form.value };
    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = this.editingId
          ? 'Alterações salvas com sucesso.'
          : 'Cor criada com sucesso.';
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

  excluir(item: Cor): void {
    const id = (item as any).Idcor;
    if (!id) return;
    if (!confirm(`Excluir a cor "${(item as any).Descricao}"?`)) return;

    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Cor excluída.';
        const eraUltimo = this.cores.length === 1 && this.page > 1;
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

  // --------- Overlay de erros ---------
  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const P = (c: boolean, m: string) => { if (c) msgs.push(m); };

    P(f.get('Descricao')?.hasError('required') || false, 'Descrição é obrigatória.');
    P(f.get('Descricao')?.hasError('maxlength') || false, 'Descrição: máx. 100 caracteres.');
    P(f.get('Cor')?.hasError('required') || false, 'Nome da cor é obrigatório.');
    P(f.get('Cor')?.hasError('maxlength') || false, 'Cor: máx. 30 caracteres.');
    P(f.get('Codigo')?.hasError('maxlength') || false, 'Código: máx. 12 caracteres.');

    ['Descricao','Codigo','Cor','Status'].forEach(field => {
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
