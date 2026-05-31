import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Caixa } from '../../core/models/caixa';
import { Loja } from '../../core/models/loja';
import { CaixasService } from '../../core/services/caixas.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-caixas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './caixas.component.html',
  styleUrls: ['./caixas.component.css']
})
export class CaixasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CaixasService);
  private lojasApi = inject(LojasService);

  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  search = '';
  errorMsg = '';
  successMsg = '';

  caixas: Caixa[] = [];
  lojas: Loja[] = [];

  form = this.fb.group({
    tipo_caixa: ['LOJA' as 'LOJA' | 'MASTER', Validators.required],
    idloja: [null as number | null],
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    saldo_inicial: [0, Validators.required],
    saldo_atual: [0, Validators.required],
    ativo: [true],
    data_abertura: [this.today(), Validators.required]
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({ lojas: this.lojasApi.list(), caixas: this.api.list() }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.caixas = this.filter(this.unwrap<Caixa>(res.caixas));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar caixas.';
      }
    });
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      tipo_caixa: 'LOJA',
      codigo: '',
      descricao: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true,
      data_abertura: this.today()
    });
  }

  editar(item: Caixa): void {
    this.showForm = true;
    this.editingId = item.Idcaixa ?? null;
    this.form.reset({
      idloja: item.idloja,
      tipo_caixa: item.tipo_caixa ?? 'LOJA',
      codigo: item.codigo,
      descricao: item.descricao,
      saldo_inicial: Number(item.saldo_inicial),
      saldo_atual: Number(item.saldo_atual),
      ativo: item.ativo,
      data_abertura: item.data_abertura
    });
  }

  salvar(): void {
    if (this.form.invalid || (this.form.value.tipo_caixa !== 'MASTER' && !this.form.value.idloja)) {
      this.errorMsg = 'Revise os campos obrigatórios.';
      return;
    }
    const raw = this.form.value;
    const payload: Partial<Caixa> = {
      tipo_caixa: raw.tipo_caixa ?? 'LOJA',
      idloja: raw.tipo_caixa === 'MASTER' ? null : Number(raw.idloja),
      codigo: String(raw.codigo || '').trim(),
      descricao: String(raw.descricao || '').trim(),
      saldo_inicial: Number(raw.saldo_inicial || 0),
      saldo_atual: Number(raw.saldo_atual || 0),
      ativo: !!raw.ativo,
      data_abertura: String(raw.data_abertura)
    };
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Caixa salvo.';
        this.cancelar();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar caixa.';
      }
    });
  }

  excluir(item: Caixa): void {
    const id = item.Idcaixa;
    if (!id || !confirm(`Excluir o caixa "${item.descricao}"?`)) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Caixa excluído.';
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao excluir caixa.'
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
  }

  lojaNome(id?: number | null): string {
    if (!id) return 'Grupo';
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  private filter(items: Caixa[]): Caixa[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q) ||
      this.lojaNome(c.idloja).toLowerCase().includes(q)
    );
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
