import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ContaBancaria } from '../../core/models/conta-bancaria';
import { Loja } from '../../core/models/loja';
import { ContasBancariasService } from '../../core/services/contas-bancarias.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-contas-bancarias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './contas-bancarias.component.html',
  styleUrls: ['./contas-bancarias.component.css']
})
export class ContasBancariasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ContasBancariasService);
  private lojasApi = inject(LojasService);

  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;
  search = '';
  errorMsg = '';
  successMsg = '';
  contas: ContaBancaria[] = [];
  lojas: Loja[] = [];

  form = this.fb.group({
    idloja: [null as number | null, Validators.required],
    descricao: ['', [Validators.required, Validators.maxLength(120)]],
    banco: ['', [Validators.required, Validators.maxLength(80)]],
    agencia: ['', [Validators.required, Validators.maxLength(20)]],
    conta: ['', [Validators.required, Validators.maxLength(30)]],
    tipo_conta: ['CORRENTE', Validators.required],
    pix_chave: [''],
    saldo_inicial: [0, Validators.required],
    saldo_atual: [0, Validators.required],
    ativo: [true]
  });

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    forkJoin({ lojas: this.lojasApi.list(), contas: this.api.list() }).subscribe({
      next: res => {
        this.lojas = this.unwrap<Loja>(res.lojas);
        this.contas = this.filter(this.unwrap<ContaBancaria>(res.contas));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Falha ao carregar contas bancárias.';
      }
    });
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      idloja: this.lojas[0]?.id ?? null,
      descricao: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: 'CORRENTE',
      pix_chave: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      ativo: true
    });
  }

  editar(item: ContaBancaria): void {
    this.showForm = true;
    this.editingId = item.Idconta ?? null;
    this.form.reset({
      idloja: item.idloja,
      descricao: item.descricao,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      tipo_conta: item.tipo_conta,
      pix_chave: item.pix_chave ?? '',
      saldo_inicial: Number(item.saldo_inicial),
      saldo_atual: Number(item.saldo_atual),
      ativo: item.ativo
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.errorMsg = 'Revise os campos obrigatórios.';
      return;
    }
    const raw = this.form.value;
    const payload: Partial<ContaBancaria> = {
      idloja: Number(raw.idloja),
      descricao: String(raw.descricao || '').trim(),
      banco: String(raw.banco || '').trim(),
      agencia: String(raw.agencia || '').trim(),
      conta: String(raw.conta || '').trim(),
      tipo_conta: raw.tipo_conta as any,
      pix_chave: String(raw.pix_chave || '').trim() || null,
      saldo_inicial: Number(raw.saldo_inicial || 0),
      saldo_atual: Number(raw.saldo_atual || 0),
      ativo: !!raw.ativo
    };
    this.saving = true;
    const req = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Conta bancária salva.';
        this.cancelar();
        this.loadAll();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Falha ao salvar conta bancária.';
      }
    });
  }

  excluir(item: ContaBancaria): void {
    const id = item.Idconta;
    if (!id || !confirm(`Excluir a conta "${item.descricao}"?`)) return;
    this.api.remove(id).subscribe({
      next: () => {
        this.successMsg = 'Conta bancária excluída.';
        this.loadAll();
      },
      error: () => this.errorMsg = 'Falha ao excluir conta bancária.'
    });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
  }

  lojaNome(id: number): string {
    return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`;
  }

  private filter(items: ContaBancaria[]): ContaBancaria[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c =>
      c.descricao.toLowerCase().includes(q) ||
      c.banco.toLowerCase().includes(q) ||
      c.agencia.toLowerCase().includes(q) ||
      c.conta.toLowerCase().includes(q) ||
      this.lojaNome(c.idloja).toLowerCase().includes(q)
    );
  }

  private unwrap<T>(res: any): T[] {
    return Array.isArray(res) ? res : (res?.results ?? []);
  }
}
