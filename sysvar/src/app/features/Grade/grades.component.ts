import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';
import { GradeModel } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './grades.component.html',
  styleUrls: ['./grades.component.css'],
})
export class GradesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private gradesApi = inject(GradesService);
  private tamanhosApi = inject(TamanhosService);
  constructor(private router: Router) {}

  goHome() { this.router.navigate(['/home']); }

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  grades: GradeModel[] = [];
  tamanhos: TamanhoModel[] = [];

  search = '';
  selectedGradeId: number | null = null;

  formModeGrade: 'new' | 'edit' | null = null;
  editingGradeId: number | null = null;

  formGrade = this.fb.group({
    Descricao: ['', [Validators.required, Validators.maxLength(100)]],
    Status: [''],
  });

  editingTamId: number | null = null;
  submittedSub = false;

  formTamanho = this.fb.group({
    Idgrade: [0, [Validators.required]],
    Tamanho: ['', [Validators.required, Validators.maxLength(10)]],
    Descricao: ['Tamanho', [Validators.required, Validators.maxLength(100)]],
    Status: [''],
  });

  ngOnInit(): void { this.loadGrades(); }

  // ===== GRADES =====
  loadGrades() {
    this.loading = true; this.errorMsg = '';
    // <- sem 'search', o service só aceita { ordering?: string }
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.grades = Array.isArray(rows) ? rows : [];
      },
      error: () => { this.errorMsg = 'Falha ao carregar grades.'; },
      complete: () => { this.loading = false; }
    });
  }
  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.doSearch(); }
  doSearch() {
    // filtro client-side simples
    // nada a fazer aqui além de disparar change detection; lista usa *ngFor="grades | filtro"
  }
  clearSearch() { this.search = ''; }

  novoGrade() {
    this.editingGradeId = null;
    this.formModeGrade = 'new';
    this.submitted = false;
    this.formGrade.reset({ Descricao: '', Status: '' });
    this.successMsg = ''; this.errorMsg = '';
  }

  editarGrade(g: GradeModel) {
    this.editingGradeId = g.Idgrade ?? null;
    this.formModeGrade = 'edit';
    this.submitted = false;
    this.formGrade.reset({ Descricao: g.Descricao ?? '', Status: g.Status ?? '' });
    this.successMsg = ''; this.errorMsg = '';
  }

  salvarGrade() {
    this.submitted = true;
    if (this.formGrade.invalid) { this.errorMsg = 'Revise os campos destacados.'; return; }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const raw = this.formGrade.getRawValue();
    const payload = {
      Descricao: String(raw.Descricao ?? '').trim(),
      Status: (raw.Status ?? '') || null,
    };

    const isEdit = !!this.editingGradeId;
    const req$ = isEdit
      ? this.gradesApi.update(this.editingGradeId!, payload)
      : this.gradesApi.create(payload);

    req$.subscribe({
      next: (g) => {
        this.successMsg = isEdit ? 'Grade atualizada.' : 'Grade criada.';
        this.loadGrades();
        this.cancelarEdicaoGrade();
        if (!isEdit && (g as any)?.Idgrade) this.selecionarGrade((g as any).Idgrade);
      },
      error: (err: HttpErrorResponse) => {
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar a grade.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluirGrade(g: GradeModel) {
    if (!g.Idgrade) return;
    if (!confirm(`Excluir a grade "${g.Descricao}"?`)) return;
    this.gradesApi.remove(g.Idgrade).subscribe({
      next: () => {
        this.successMsg = 'Grade excluída.';
        if (this.selectedGradeId === g.Idgrade) this.fecharTamanhos();
        this.loadGrades();
        if (this.editingGradeId === g.Idgrade) this.novoGrade();
      },
      error: () => this.errorMsg = 'Falha ao excluir a grade.'
    });
  }

  cancelarEdicaoGrade() {
    this.editingGradeId = null;
    this.formModeGrade = null;
    this.submitted = false;
    this.formGrade.reset({ Descricao: '', Status: '' });
  }

  fieldInvalidGrade(name: string) {
    const c = this.formGrade.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }
  getGradeErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidGrade('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    return msgs;
  }

  // ===== TAMANHOS =====
  selecionarGrade(id: number) {
    this.selectedGradeId = id;
    this.carregarTamanhos(id);
    this.novoTamanho();
  }
  fecharTamanhos() {
    this.selectedGradeId = null;
    this.tamanhos = [];
    this.novoTamanho();
  }
  carregarTamanhos(idgrade: number) {
    this.tamanhosApi.list({ idgrade, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.tamanhos = Array.isArray(rows) ? rows : [];
      },
      error: () => this.errorMsg = 'Falha ao carregar tamanhos.'
    });
  }

  novoTamanho() {
    this.editingTamId = null;
    this.submittedSub = false;
    this.formTamanho.reset({
      Idgrade: this.selectedGradeId ?? 0,
      Tamanho: '',
      Descricao: 'Tamanho',
      Status: ''
    });
  }

  editarTamanho(t: TamanhoModel) {
    this.editingTamId = t.Idtamanho ?? null;
    this.submittedSub = false;
    this.formTamanho.reset({
      Idgrade: (t as any).idgrade?.Idgrade ?? (t as any).idgrade ?? this.selectedGradeId ?? 0,
      Tamanho: t.Tamanho ?? '',
      Descricao: t.Descricao ?? 'Tamanho',
      Status: t.Status ?? ''
    });
  }

  salvarTamanho() {
    this.submittedSub = true;
    if (this.formTamanho.invalid) return;

    const raw = this.formTamanho.getRawValue();
    const payload = {
      idgrade: Number(raw.Idgrade),
      Tamanho: String(raw.Tamanho ?? '').trim(),
      Descricao: String(raw.Descricao ?? '').trim() || 'Tamanho',
      Status: (raw.Status ?? '') || null
    };

    const req$ = this.editingTamId
      ? this.tamanhosApi.update(this.editingTamId, payload)
      : this.tamanhosApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingTamId ? 'Tamanho atualizado.' : 'Tamanho criado.';
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
        this.novoTamanho();
      },
      error: () => this.errorMsg = 'Falha ao salvar o tamanho.'
    });
  }

  excluirTamanho(t: TamanhoModel) {
    if (!t.Idtamanho) return;
    if (!confirm(`Excluir o tamanho "${t.Tamanho}"?`)) return;
    this.tamanhosApi.remove(t.Idtamanho).subscribe({
      next: () => {
        this.successMsg = 'Tamanho excluído.';
        if (this.selectedGradeId) this.carregarTamanhos(this.selectedGradeId);
      },
      error: () => this.errorMsg = 'Falha ao excluir o tamanho.'
    });
  }

  cancelarEdicaoTamanho() { this.novoTamanho(); }

  fieldInvalidTamanho(name: string) {
    const c = this.formTamanho.get(name);
    return (c?.touched || this.submittedSub) && c?.invalid;
  }
  getTamanhoErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidTamanho('Idgrade')) msgs.push('Selecione a Grade.');
    if (this.fieldInvalidTamanho('Tamanho')) msgs.push('Informe o código do Tamanho (máx. 10).');
    if (this.fieldInvalidTamanho('Descricao')) msgs.push('Informe a Descrição (máx. 100).');
    return msgs;
  }
}
