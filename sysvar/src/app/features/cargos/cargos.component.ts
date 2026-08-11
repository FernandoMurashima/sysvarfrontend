import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Cargo } from '../../core/models/cargo';
import { CargosService } from '../../core/services/cargos.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-cargos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cargos.component.html',
  styleUrls: ['./cargos.component.css'],
})
export class CargosComponent implements OnInit {
  private api = inject(CargosService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  cargos: Cargo[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  search = '';
  loading = false;
  saving = false;
  editingId: number | null = null;
  errorMsg = '';
  successMsg = '';

  form = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    descricao: ['', [Validators.required, Validators.maxLength(80)]],
    ativo: [true],
    participa_vendas: [false],
    permite_comissao: [false],
    autoridade_operacional_loja: [false],
    permite_multiplas_lojas: [false],
    gerencial: [false],
  });

  get podeEditar(): boolean {
    return this.auth.podeAcessarModulo('cadastros', true) !== false;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list({ page: this.page, page_size: this.pageSize, search: this.search, ordering: 'descricao' }).subscribe({
      next: (res: any) => {
        this.cargos = Array.isArray(res) ? res : (res?.results ?? []);
        this.total = Array.isArray(res) ? this.cargos.length : (res?.count ?? 0);
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar cargos.'; },
    });
  }

  novo(): void {
    this.editingId = null;
    this.form.reset({ codigo: '', descricao: '', ativo: true, participa_vendas: false, permite_comissao: false, autoridade_operacional_loja: false, permite_multiplas_lojas: false, gerencial: false });
  }

  editar(cargo: Cargo): void {
    this.editingId = cargo.id ?? null;
    this.form.reset({
      codigo: cargo.codigo,
      descricao: cargo.descricao,
      ativo: cargo.ativo !== false,
      participa_vendas: !!cargo.participa_vendas,
      permite_comissao: !!cargo.permite_comissao,
      autoridade_operacional_loja: !!cargo.autoridade_operacional_loja,
      permite_multiplas_lojas: !!cargo.permite_multiplas_lojas,
      gerencial: !!cargo.gerencial,
    });
  }

  salvar(): void {
    if (this.form.invalid || !this.podeEditar) return;
    this.saving = true;
    const payload = this.form.getRawValue() as Cargo;
    const req$ = this.editingId ? this.api.update(this.editingId, payload) : this.api.create(payload);
    req$.subscribe({
      next: () => { this.saving = false; this.successMsg = 'Cargo salvo.'; this.novo(); this.load(); },
      error: (err) => { this.saving = false; this.errorMsg = err?.error?.detail || 'Falha ao salvar cargo.'; },
    });
  }

  excluir(cargo: Cargo): void {
    if (!cargo.id || !this.podeEditar) return;
    this.api.remove(cargo.id).subscribe({
      next: () => { this.successMsg = 'Cargo excluído.'; this.load(); },
      error: (err) => { this.errorMsg = err?.error?.detail || 'Falha ao excluir cargo.'; },
    });
  }
}
