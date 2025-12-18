// src/app/features/formas-pagamento/formas-pagamento.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { FormasPagamentoService } from '../../core/services/formas-pagamento.service';
import { FormaPagamento, FormaPagamentoParcela } from '../../core/models/forma-pagamento';

@Component({
  selector: 'app-formas-pagamento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './formas-pagamento.component.html',
  styleUrls: ['./formas-pagamento.component.css']
})
export class FormasPagamentoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(FormasPagamentoService);

  loading = false;
  saving = false;
  submitted = false;
  showForm = false;
  editingId: number | null = null;

  search = '';
  successMsg = '';
  errorMsg = '';
  errorOverlayOpen = false;

  formasAll: FormaPagamento[] = [];
  formas: FormaPagamento[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  originalParcelasIds: number[] = [];

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    ativo: [true],
    parcelas: this.fb.array([])
  });

  get parcelasFA(): FormArray {
    return this.form.get('parcelas') as FormArray;
  }

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

  // ====== Helpers ======

  private filterList(all: FormaPagamento[]): FormaPagamento[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(f =>
      (f.codigo || '').toLowerCase().includes(q) ||
      (f.descricao || '').toLowerCase().includes(q)
    );
  }

  private applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.formas = this.formasAll.slice(start, end);
  }

  private makeParcelaGroup(p?: Partial<FormaPagamentoParcela>): FormGroup {
    return this.fb.group({
      Idformapagparcela: [p?.Idformapagparcela ?? null],
      ordem: [p?.ordem ?? (this.parcelasFA.length + 1), [Validators.required, Validators.min(1)]],
      dias: [p?.dias ?? 0, [Validators.required, Validators.min(0)]],
      percentual: [p?.percentual ?? null],
      valor_fixo: [p?.valor_fixo ?? null],
    });
  }

  private clearParcelas(): void {
    while (this.parcelasFA.length) {
      this.parcelasFA.removeAt(0);
    }
    this.originalParcelasIds = [];
  }

  private blankToNull(v: any): string | null {
    const s = (v ?? '').toString().trim();
    return s === '' ? null : s;
  }

  // ====== Fluxo lista ======

  load(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (res: any) => {
        const rawArr: FormaPagamento[] = Array.isArray(res) ? res : (res?.results ?? []);
        const filtered = this.filterList(rawArr);
        this.formasAll = filtered;
        this.total = filtered.length;
        this.page = 1;
        this.applyPage();
        this.loading = false;
        this.errorMsg = '';
      },
      error: () => {
        this.formasAll = [];
        this.formas = [];
        this.total = 0;
        this.loading = false;
        this.errorMsg = 'Falha ao carregar formas de pagamento.';
      }
    });
  }

  onPageSizeChange(sizeStr: string): void {
    this.pageSize = Number(sizeStr) || 10;
    this.page = 1;
    this.applyPage();
  }

  firstPage(): void {
    if (this.page !== 1) {
      this.page = 1;
      this.applyPage();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPage();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPage();
    }
  }

  lastPage(): void {
    if (this.page !== this.totalPages) {
      this.page = this.totalPages;
      this.applyPage();
    }
  }

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

  // ====== Fluxo form ======

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.reset({
      codigo: '',
      descricao: '',
      ativo: true
    });
    this.clearParcelas();
    this.addParcela();
  }

  editar(row: FormaPagamento): void {
    const id = row.Idformapagamento ?? (row as any).id ?? null;
    if (!id) return;

    this.showForm = true;
    this.editingId = id;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.loading = true;

    this.api.get(id).subscribe({
      next: (det: FormaPagamento) => {
        this.form.reset({
          codigo: det.codigo ?? '',
          descricao: det.descricao ?? '',
          ativo: !!det.ativo
        });

        this.clearParcelas();
        const parcelas = det.parcelas ?? [];
        this.originalParcelasIds = parcelas
          .map(p => p.Idformapagparcela)
          .filter((x): x is number => typeof x === 'number');

        parcelas
          .slice()
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .forEach(p => this.parcelasFA.push(this.makeParcelaGroup(p)));

        if (this.parcelasFA.length === 0) {
          this.addParcela();
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar detalhes da forma.';
      }
    });
  }

  cancelarEdicao(): void {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.errorOverlayOpen = false;
    this.clearParcelas();
  }

  addParcela(): void {
    this.parcelasFA.push(this.makeParcelaGroup());
  }

  removeParcela(ix: number): void {
    if (ix < 0 || ix >= this.parcelasFA.length) return;
    this.parcelasFA.removeAt(ix);
    // renumera ordens
    this.parcelasFA.controls.forEach((fg, i) => {
      const ctrl = fg.get('ordem');
      if (ctrl) ctrl.setValue(i + 1);
    });
  }

  salvar(): void {
    this.submitted = true;

    if (this.parcelasFA.length === 0) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    if (this.form.invalid) {
      this.openErrorOverlayIfNeeded();
      return;
    }

    const f = this.form.value as any;
    const numParcelas = this.parcelasFA.length;

    const payload: any = {
      codigo: (f.codigo || '').toString().trim(),
      descricao: (f.descricao || '').toString().trim(),
      ativo: !!f.ativo,
      num_parcelas: numParcelas
    };

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const isEdit = this.editingId != null;

    const afterFormaSaved = (formaId: number) => {
      // monta payloads das parcelas
      const parcelasPayload = this.parcelasFA.controls.map(fg => {
        const raw = fg.value as any;
        return {
          forma: formaId,
          ordem: Number(raw.ordem) || 1,
          dias: Number(raw.dias) || 0,
          percentual: this.blankToNull(raw.percentual),
          valor_fixo: this.blankToNull(raw.valor_fixo),
        };
      });

      const deleteIds = [...this.originalParcelasIds];

      const doCreates = () => {
        if (parcelasPayload.length === 0) {
          this.saving = false;
          this.successMsg = isEdit ? 'Alterações salvas com sucesso.' : 'Forma criada com sucesso.';
          this.cancelarEdicao();
          this.page = 1;
          this.load();
          return;
        }

        const creates$ = parcelasPayload.map(p =>
          this.api.createParcela(p)
        );

        forkJoin(creates$).subscribe({
          next: () => {
            this.saving = false;
            this.successMsg = isEdit ? 'Alterações salvas com sucesso.' : 'Forma criada com sucesso.';
            this.cancelarEdicao();
            this.page = 1;
            this.load();
          },
          error: () => {
            this.saving = false;
            this.errorMsg = 'Falha ao salvar parcelas.';
          }
        });
      };

      if (deleteIds.length > 0) {
        const deletes$ = deleteIds.map(id => this.api.deleteParcela(id));
        forkJoin(deletes$).subscribe({
          next: () => { doCreates(); },
          error: () => {
            this.saving = false;
            this.errorMsg = 'Falha ao atualizar parcelas.';
          }
        });
      } else {
        doCreates();
      }
    };

    if (!isEdit) {
      this.api.create(payload).subscribe({
        next: (created: FormaPagamento) => {
          const formaId = created.Idformapagamento ?? (created as any).id;
          if (!formaId) {
            this.saving = false;
            this.errorMsg = 'Forma criada, mas não foi possível obter o ID.';
            return;
          }
          this.originalParcelasIds = []; // não havia antes
          afterFormaSaved(formaId);
        },
        error: (err) => {
          this.saving = false;
          this.handleServerErrors(err);
        }
      });
    } else {
      const id = this.editingId!;
      this.api.update(id, payload).subscribe({
        next: () => {
          afterFormaSaved(id);
        },
        error: (err) => {
          this.saving = false;
          this.handleServerErrors(err);
        }
      });
    }
  }

  excluir(item: FormaPagamento): void {
    const id = item.Idformapagamento ?? (item as any).id;
    if (!id) return;
    if (!confirm(`Excluir a forma "${item.codigo} - ${item.descricao}"?`)) return;

    this.saving = true;
    this.api.remove(id).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Forma excluída.';
        const eraUltimo = this.formas.length === 1 && this.page > 1;
        if (eraUltimo) this.page--;
        this.load();
        if (this.editingId === id) this.cancelarEdicao();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao excluir forma.';
      }
    });
  }

  // ====== Erros / overlay ======

  getFormErrors(): string[] {
    const f = this.form;
    const msgs: string[] = [];
    const push = (cond: boolean, msg: string) => { if (cond) msgs.push(msg); };

    push(f.get('codigo')?.hasError('required') || false, 'codigo: Este campo é obrigatório.');
    push(f.get('codigo')?.hasError('maxlength') || false, 'codigo: Máx. 10 caracteres.');
    push(f.get('descricao')?.hasError('required') || false, 'descricao: Este campo é obrigatório.');
    push(f.get('descricao')?.hasError('maxlength') || false, 'descricao: Máx. 120 caracteres.');

    const fields = ['codigo', 'descricao'];
    const seen = new Set<string>();
    fields.forEach(field => {
      const err = f.get(field)?.errors?.['server'];
      if (err && !seen.has(field)) {
        msgs.push(`${field}: ${err}`);
        seen.add(field);
      }
    });

    this.parcelasFA.controls.forEach((fg, i) => {
      const p = i + 1;
      if (fg.get('ordem')?.hasError('required') || fg.get('ordem')?.hasError('min')) {
        msgs.push(`Parcela ${p}: ordem inválida.`);
      }
      if (fg.get('dias')?.hasError('required') || fg.get('dias')?.hasError('min')) {
        msgs.push(`Parcela ${p}: dias inválido.`);
      }
    });

    if (this.parcelasFA.length === 0) {
      msgs.push('É necessário informar ao menos uma parcela.');
    }

    return msgs;
  }

  openErrorOverlayIfNeeded(): void {
    this.errorOverlayOpen = this.getFormErrors().length > 0;
  }

  closeErrorOverlay(): void {
    this.errorOverlayOpen = false;
  }

  private handleServerErrors(err: any): void {
    this.successMsg = '';

    const serverErrors = err?.error && typeof err.error === 'object' ? err.error : null;
    if (serverErrors) {
      const mapToCtrl = (apiField: string) => apiField; // direto
      const seen = new Set<string>();
      Object.keys(serverErrors).forEach(apiField => {
        const ctrlName = mapToCtrl(apiField);
        const ctrl = this.form.get(ctrlName);
        if (!ctrl || seen.has(ctrlName)) return;
        ctrl.setErrors({
          ...(ctrl.errors || {}),
          server: Array.isArray(serverErrors[apiField])
            ? serverErrors[apiField].join(' ')
            : String(serverErrors[apiField])
        });
        seen.add(ctrlName);
      });
    }
    this.openErrorOverlayIfNeeded();
  }
}
