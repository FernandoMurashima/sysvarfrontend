import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PacksService } from '../../core/services/pack.service';
import { PackItensService } from '../../core/services/pack-item.service';
import { GradesService } from '../../core/services/grades.service';
import { TamanhosService } from '../../core/services/tamanhos.service';

import { PackModel } from '../../core/models/pack';
import { PackItemModel } from '../../core/models/pack-item';
import { GradeModel } from '../../core/models/grade';
import { TamanhoModel } from '../../core/models/tamanho';

@Component({
  selector: 'app-packs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './packs.component.html',
  styleUrls: ['./packs.component.css'],
})
export class PacksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private packsApi = inject(PacksService);
  private itensApi = inject(PackItensService);
  private gradesApi = inject(GradesService);
  private tamanhosApi = inject(TamanhosService);
  constructor(private router: Router) {}

  goHome() { this.router.navigate(['/home']); }

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  submitted = false;

  packs: PackModel[] = [];
  items: PackItemModel[] = [];
  grades: GradeModel[] = [];
  tamanhosDaGrade: TamanhoModel[] = [];

  search = '';
  selectedPackId: number | null = null;

  formModePack: 'new' | 'edit' | null = null;
  editingPackId: number | null = null;

  formPack = this.fb.group({
    nome: ['', [Validators.maxLength(80)]],
    grade: [null as number | null, [Validators.required]],
    ativo: [true],
  });

  editingItemId: number | null = null;
  submittedSub = false;

  formItem = this.fb.group({
    pack: [0, [Validators.required]],
    tamanho: [null as number | null, [Validators.required]],
    qtd: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadGrades();
    this.loadPacks();
  }

  // ===== helpers p/ template (evita arrow em template) =====
  getGradeDesc(id: number | null | undefined): string {
    if (!id) return '';
    const g = this.grades.find(x => x.Idgrade === id);
    return g?.Descricao ?? String(id);
  }
  getTamanhoDesc(id: number | null | undefined): string {
    if (!id) return '';
    const t = this.tamanhosDaGrade.find(x => x.Idtamanho === id);
    return t ? (t.Tamanho || (t.Descricao ?? String(id))) : String(id);
  }

  // ===== MASTER =====
  loadGrades() {
    this.gradesApi.list({ ordering: 'Descricao' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.grades = Array.isArray(rows) ? rows : [];
      },
      error: () => {},
    });
  }

  loadPacks() {
    this.loading = true; this.errorMsg = '';
    this.packsApi.list({ search: this.search, ordering: '-data_cadastro' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.packs = Array.isArray(rows) ? rows : [];
      },
      error: () => (this.errorMsg = 'Falha ao carregar packs.'),
      complete: () => (this.loading = false),
    });
  }

  onSearchKeyup(ev: KeyboardEvent) { if (ev.key === 'Enter') this.loadPacks(); }
  doSearch() { this.loadPacks(); }
  clearSearch() { this.search = ''; this.loadPacks(); }

  novoPack() {
    this.editingPackId = null;
    this.formModePack = 'new';
    this.submitted = false;
    this.formPack.reset({ nome: '', grade: null, ativo: true });
    this.successMsg = ''; this.errorMsg = '';
  }

  editarPack(p: PackModel) {
    this.editingPackId = p.id ?? null;
    this.formModePack = 'edit';
    this.submitted = false;
    this.formPack.reset({ nome: p.nome ?? '', grade: p.grade ?? null, ativo: !!p.ativo });
    this.successMsg = ''; this.errorMsg = '';
  }

  salvarPack() {
    this.submitted = true;
    if (this.formPack.invalid) { this.errorMsg = 'Revise os campos destacados.'; return; }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const raw = this.formPack.getRawValue();
    const payload = {
      nome: (raw.nome ?? '') || null,
      grade: Number(raw.grade),
      ativo: !!raw.ativo
    };

    const isEdit = !!this.editingPackId;
    const req$ = isEdit
      ? this.packsApi.update(this.editingPackId!, payload)
      : this.packsApi.create(payload);

    req$.subscribe({
      next: (p) => {
        this.successMsg = isEdit ? 'Pack atualizado.' : 'Pack criado.';
        this.loadPacks();
        this.cancelarEdicaoPack();
        if (!isEdit && (p as any)?.id) this.selecionarPack((p as any).id, (p as any).grade);
      },
      error: (err: HttpErrorResponse) => {
        const detail = (err?.error?.detail || err?.error?.error || err?.error) ?? '';
        this.errorMsg = (typeof detail === 'string' && detail) ? detail : 'Falha ao salvar o pack.';
      },
      complete: () => (this.saving = false),
    });
  }

  excluirPack(p: PackModel) {
    if (!p.id) return;
    if (!confirm(`Excluir o pack "${p.nome || ('#'+p.id)}"?`)) return;
    this.packsApi.remove(p.id).subscribe({
      next: () => {
        this.successMsg = 'Pack excluído.';
        if (this.selectedPackId === p.id) this.fecharItens();
        this.loadPacks();
        if (this.editingPackId === p.id) this.novoPack();
      },
      error: () => (this.errorMsg = 'Falha ao excluir o pack.'),
    });
  }

  cancelarEdicaoPack() {
    this.editingPackId = null;
    this.formModePack = null;
    this.submitted = false;
    this.formPack.reset({ nome: '', grade: null, ativo: true });
  }

  fieldInvalidPack(name: string) {
    const c = this.formPack.get(name);
    return (c?.touched || this.submitted) && c?.invalid;
  }
  getPackErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidPack('grade')) msgs.push('Selecione a Grade.');
    return msgs;
  }

  // ===== SUB: ITENS =====
  selecionarPack(id: number, gid: number) {
    this.selectedPackId = id;
    this.formItem.patchValue({ pack: id });
    this.loadItens(id);
    this.loadTamanhos(gid);
    this.novoItem();
  }

  fecharItens() {
    this.selectedPackId = null;
    this.items = [];
    this.tamanhosDaGrade = [];
    this.novoItem();
  }

  loadItens(packId: number) {
    this.itensApi.list({ pack: packId, ordering: 'tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.items = Array.isArray(rows) ? rows : [];
      },
      error: () => (this.errorMsg = 'Falha ao carregar itens do pack.'),
    });
  }

  loadTamanhos(gid: number) {
    if (!gid) { this.tamanhosDaGrade = []; return; }
    this.tamanhosApi.list({ idgrade: gid, ordering: 'Tamanho' }).subscribe({
      next: (data) => {
        const payload: any = data as any;
        const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
        this.tamanhosDaGrade = Array.isArray(rows) ? rows : [];
      },
      error: () => {},
    });
  }

  novoItem() {
    if (!this.selectedPackId) return;
    this.editingItemId = null;
    this.submittedSub = false;
    this.formItem.reset({ pack: this.selectedPackId, tamanho: null, qtd: 1 });
  }

  editarItem(it: PackItemModel) {
    this.editingItemId = it.id ?? null;
    this.submittedSub = false;
    this.formItem.reset({ pack: it.pack, tamanho: it.tamanho, qtd: it.qtd });
  }

  salvarItem() {
    this.submittedSub = true;
    if (this.formItem.invalid || !this.selectedPackId) return;

    const raw = this.formItem.getRawValue();
    const payload = {
      pack: Number(raw.pack),
      tamanho: Number(raw.tamanho),
      qtd: Number(raw.qtd),
    };

    const req$ = this.editingItemId
      ? this.itensApi.update(this.editingItemId, payload)
      : this.itensApi.create(payload);

    req$.subscribe({
      next: () => {
        this.successMsg = this.editingItemId ? 'Item atualizado.' : 'Item adicionado.';
        this.loadItens(this.selectedPackId!);
        this.novoItem();
      },
      error: () => (this.errorMsg = 'Falha ao salvar o item do pack.'),
    });
  }

  excluirItem(it: PackItemModel) {
    if (!it.id) return;
    if (!confirm('Excluir este item do pack?')) return;
    this.itensApi.remove(it.id).subscribe({
      next: () => { this.successMsg = 'Item excluído.'; if (this.selectedPackId) this.loadItens(this.selectedPackId); },
      error: () => (this.errorMsg = 'Falha ao excluir o item do pack.'),
    });
  }

  cancelarEdicaoItem() { this.novoItem(); }

  fieldInvalidItem(name: string) {
    const c = this.formItem.get(name);
    return (c?.touched || this.submittedSub) && c?.invalid;
  }
  getItemErrors(): string[] {
    const msgs: string[] = [];
    if (this.fieldInvalidItem('tamanho')) msgs.push('Selecione o Tamanho.');
    if (this.fieldInvalidItem('qtd')) msgs.push('Informe a Quantidade (>= 1).');
    return msgs;
  }
}
