import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventarioEstoque, InventarioEstoqueItem } from '../../core/models/estoque';
import { Loja } from '../../core/models/loja';
import { EstoqueService } from '../../core/services/estoque.service';
import { LojasService } from '../../core/services/lojas.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-estoque-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './estoque-inventario.component.html',
  styleUrls: ['./estoque-inventario.component.css']
})
export class EstoqueInventarioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EstoqueService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);
  loading = false; saving = false; showForm = false; errorMsg = ''; successMsg = '';
  lojas: Loja[] = []; inventarios: InventarioEstoque[] = []; selecionado: InventarioEstoque | null = null;
  fecharModal: InventarioEstoque | null = null;
  get podeEditarModulo(): boolean { return this.auth.podeAcessarModulo('estoque', true) !== false; }
  form = this.fb.group({ Idloja: [null as number | null, Validators.required], descricao: ['', Validators.required], data_abertura: [this.today(), Validators.required], observacao: [''] });
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    forkJoin({ lojas: this.lojasApi.list(), invs: this.api.listInventarios() }).subscribe({
      next: r => { this.lojas = this.unwrap<Loja>(r.lojas); this.inventarios = this.unwrap<InventarioEstoque>(r.invs); this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'Falha ao carregar inventários.'; }
    });
  }
  novo(): void { if (!this.podeEditarModulo) return; this.showForm = true; this.form.reset({ Idloja: this.lojas[0]?.id ?? null, descricao: '', data_abertura: this.today(), observacao: '' }); }
  salvar(): void {
    if (!this.podeEditarModulo) return;
    if (this.form.invalid) return;
    const raw = this.form.value; this.saving = true;
    this.api.createInventario({ Idloja: Number(raw.Idloja), descricao: String(raw.descricao), data_abertura: String(raw.data_abertura), observacao: String(raw.observacao || '') || null, status: 'ABERTO' }).subscribe({
      next: inv => { this.saving = false; this.showForm = false; this.successMsg = 'Inventário criado.'; this.selecionado = inv; this.load(); },
      error: () => { this.saving = false; this.errorMsg = 'Falha ao criar inventário.'; }
    });
  }
  gerarItens(inv: InventarioEstoque): void { if (!this.podeEditarModulo) return; if (!inv.Idinventario) return; this.api.gerarItensInventario(inv.Idinventario).subscribe({ next: () => { this.successMsg = 'Itens gerados.'; this.load(); }, error: () => this.errorMsg = 'Falha ao gerar itens.' }); }
  fechar(inv: InventarioEstoque): void { if (!this.podeEditarModulo) return; if (!inv.Idinventario) return; this.fecharModal = inv; }
  confirmarFechamento(): void {
    if (!this.podeEditarModulo) return;
    const inv = this.fecharModal;
    if (!inv?.Idinventario) return;
    this.api.fecharInventario(inv.Idinventario).subscribe({
      next: () => { this.fecharModal = null; this.successMsg = 'Inventário fechado.'; this.load(); },
      error: () => this.errorMsg = 'Falha ao fechar inventário.'
    });
  }
  cancelarFechamento(): void { this.fecharModal = null; }
  atualizarItem(item: InventarioEstoqueItem): void { if (!this.podeEditarModulo) return; if (!item.Idinventarioitem) return; this.api.updateInventarioItem(item.Idinventarioitem, { saldo_contado: Number(item.saldo_contado), observacao: item.observacao }).subscribe({ next: () => this.successMsg = 'Contagem atualizada.', error: () => this.errorMsg = 'Falha ao atualizar item.' }); }
  lojaNome(id: number): string { return this.lojas.find(l => l.id === id)?.nome_loja || `Loja #${id}`; }
  private unwrap<T>(res: any): T[] { return Array.isArray(res) ? res : (res?.results ?? []); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
}
