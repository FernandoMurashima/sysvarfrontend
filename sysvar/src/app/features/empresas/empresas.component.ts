import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Empresa, EmpresaContrato, EmpresaModulo, ModuloSistema } from '../../core/models/empresa';
import { EmpresasService } from '../../core/services/empresas.service';
import { SearchSuggestComponent } from '../../shared/search-suggest/search-suggest.component';
import { AccessControlService } from '../../core/services/access-control.service';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SearchSuggestComponent],
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.css']
})
export class EmpresasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(EmpresasService);
  private accessApi = inject(AccessControlService);

  loading = false;
  saving = false;
  showForm = false;
  submitted = false;
  editingId: number | null = null;
  consultando = false;

  search = '';
  successMsg = '';
  errorMsg = '';
  excluirModal: Empresa | null = null;
  suspenderModal: Empresa | null = null;
  reativarModal: Empresa | null = null;
  suspensaoMotivo = 'INADIMPLENCIA';
  suspensaoObservacao = '';
  suspensaoConfirmacao = '';
  private successTimer: any = null;

  empresasAll: Empresa[] = [];
  empresas: Empresa[] = [];
  contratoAtual: EmpresaContrato | null = null;
  modulosCatalogo: ModuloSistema[] = [];
  empresaModulos: EmpresaModulo[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  total = 0;

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    nome_fantasia: ['', [Validators.maxLength(120)]],
    documento: ['', [Validators.maxLength(18)]],
    ativo: [true],
    contrato_status: ['ATIVO'],
    contrato_data_inicio: [this.today()],
    contrato_data_fim: [''],
    contrato_limite_sessoes_simultaneas: [1, [Validators.required, Validators.min(0)]],
    contrato_plano_completo: [false],
    contrato_observacoes: [''],
    licenca_master: [false],
    usa_vendas: [false],
    usa_compras: [false],
    usa_estoque: [false],
    usa_financeiro: [false],
    usa_fiscal: [false],
    usa_producao: [false],
    usa_distribuicao_producao: [false],
  });

  readonly modulosBasicos = ['Operacional', 'Cadastros', 'Produtos', 'Dashboards'];

  readonly modulosContratados = [
    { control: 'usa_compras', label: 'Compras' },
    { control: 'usa_estoque', label: 'Estoque' },
    { control: 'usa_distribuicao_producao', label: 'Distribuição' },
    { control: 'usa_producao', label: 'Produção' },
    { control: 'usa_vendas', label: 'Vendas' },
    { control: 'usa_financeiro', label: 'Financeiro' },
    { control: 'usa_fiscal', label: 'Fiscal e Contábil' },
  ];

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageStart(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get searchSuggestions(): string[] {
    const valores = this.empresasAll.flatMap(e => [
      e.nome,
      e.nome_fantasia,
      e.documento
    ]).filter((v): v is string => !!v);
    return Array.from(new Set(valores));
  }

  ngOnInit(): void {
    this.loadModulosCatalogo();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list({ ordering: 'nome', page_size: 1000 }).subscribe({
      next: (res: any) => {
        const rows: Empresa[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.empresasAll = this.filterRows(rows);
        this.total = this.empresasAll.length;
        this.page = 1;
        this.applyPage();
        this.errorMsg = '';
        this.loading = false;
      },
      error: () => {
        this.empresasAll = [];
        this.empresas = [];
        this.total = 0;
        this.errorMsg = 'Falha ao carregar empresas.';
        this.loading = false;
      }
    });
  }

  doSearch(): void {
    this.load();
  }

  onSearchKeyup(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') this.doSearch();
  }

  clearSearch(): void {
    this.search = '';
    this.load();
  }

  novo(): void {
    this.showForm = true;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '',
      nome_fantasia: '',
      documento: '',
      ativo: true,
      contrato_status: 'ATIVO',
      contrato_data_inicio: this.today(),
      contrato_data_fim: '',
      contrato_limite_sessoes_simultaneas: 1,
      contrato_plano_completo: false,
      contrato_observacoes: '',
      licenca_master: false,
      usa_vendas: false,
      usa_compras: false,
      usa_estoque: false,
      usa_financeiro: false,
      usa_fiscal: false,
      usa_producao: false,
      usa_distribuicao_producao: false,
    });
    this.contratoAtual = null;
    this.empresaModulos = [];
    this.aplicarMaster(false);
  }

  editar(row: Empresa): void {
    if (!row.id) return;
    this.showForm = true;
    this.editingId = row.id;
    this.consultando = false;
    this.submitted = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: row.nome ?? '',
      nome_fantasia: row.nome_fantasia ?? '',
      documento: row.documento ?? '',
      ativo: row.ativo !== false,
      contrato_status: 'ATIVO',
      contrato_data_inicio: this.today(),
      contrato_data_fim: '',
      contrato_limite_sessoes_simultaneas: 1,
      contrato_plano_completo: row.plano_completo === true,
      contrato_observacoes: '',
      licenca_master: row.licenca_master === true,
      usa_vendas: row.usa_vendas === true,
      usa_compras: row.usa_compras === true,
      usa_estoque: row.usa_estoque === true,
      usa_financeiro: row.usa_financeiro === true,
      usa_fiscal: row.usa_fiscal === true,
      usa_producao: row.usa_producao === true,
      usa_distribuicao_producao: row.usa_distribuicao_producao === true,
    });
    this.aplicarMaster(row.licenca_master === true);
    this.loadContrato(row.id);
  }

  consultar(row: Empresa): void {
    this.editar(row);
    this.consultando = true;
    this.form.disable({ emitEvent: false });
  }

  cancelar(): void {
    this.showForm = false;
    this.editingId = null;
    this.consultando = false;
    this.submitted = false;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      nome: '',
      nome_fantasia: '',
      documento: '',
      ativo: true,
      contrato_status: 'ATIVO',
      contrato_data_inicio: this.today(),
      contrato_data_fim: '',
      contrato_limite_sessoes_simultaneas: 1,
      contrato_plano_completo: false,
      contrato_observacoes: '',
      licenca_master: false,
      usa_vendas: false,
      usa_compras: false,
      usa_estoque: false,
      usa_financeiro: false,
      usa_fiscal: false,
      usa_producao: false,
      usa_distribuicao_producao: false,
    });
  }

  salvar(): void {
    this.submitted = true;
    this.successMsg = '';
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const contratoPayload = this.contratoPayload(raw);
    if (this.contratoAtual && Number(contratoPayload.limite_sessoes_simultaneas) < Number(this.contratoAtual.sessoes_ativas || 0)) {
      const excedente = Number(this.contratoAtual.sessoes_ativas || 0) - Number(contratoPayload.limite_sessoes_simultaneas || 0);
      const ok = window.confirm(`A empresa ficará com ${excedente} sessão(ões) acima do limite contratado. Deseja salvar mesmo assim?`);
      if (!ok) return;
    }
    const payload: Partial<Empresa> = {
      nome: (raw.nome || '').trim(),
      nome_fantasia: this.blankToNull(raw.nome_fantasia),
      documento: this.blankToNull(raw.documento),
      ativo: raw.ativo !== false,
      plano_completo: contratoPayload.plano_completo === true,
      licenca_master: contratoPayload.plano_completo === true,
      usa_vendas: raw.usa_vendas === true,
      usa_compras: raw.usa_compras === true,
      usa_estoque: raw.usa_estoque === true,
      usa_financeiro: raw.usa_financeiro === true,
      usa_fiscal: raw.usa_fiscal === true,
      usa_producao: raw.usa_producao === true,
      usa_ficha_tecnica: raw.usa_producao === true,
      usa_faccao: raw.usa_producao === true,
      usa_distribuicao_producao: raw.usa_distribuicao_producao === true,
    };

    this.saving = true;
    const req = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req.subscribe({
      next: (empresa) => {
        const id = this.editingId || empresa.id;
        if (!id) {
          this.finalizarSalvar();
          return;
        }
        this.api.updateContrato(id, contratoPayload).subscribe({
          next: () => this.finalizarSalvar(),
          error: (err) => {
            this.saving = false;
            this.errorMsg = `Empresa salva, mas contrato não foi atualizado: ${this.errorText(err)}`;
          }
        });
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = this.errorText(err);
      }
    });
  }

  getFormErrors(): string[] {
    const errors: string[] = [];
    const nome = this.form.get('nome');
    const fantasia = this.form.get('nome_fantasia');
    const documento = this.form.get('documento');

    if (nome?.errors?.['required']) errors.push('Informe a razão social.');
    if (nome?.errors?.['maxlength']) errors.push('Razão social deve ter no máximo 120 caracteres.');
    if (fantasia?.errors?.['maxlength']) errors.push('Nome fantasia deve ter no máximo 120 caracteres.');
    if (documento?.errors?.['maxlength']) errors.push('Documento deve ter no máximo 18 caracteres.');
    if (this.form.get('contrato_limite_sessoes_simultaneas')?.errors?.['required']) errors.push('Informe a quantidade de acessos simultâneos.');
    if (this.form.get('contrato_limite_sessoes_simultaneas')?.errors?.['min']) errors.push('Quantidade de acessos simultâneos não pode ser negativa.');
    return errors;
  }

  onMasterChange(): void {
    const enabled = this.form.get('licenca_master')?.value === true;
    this.form.patchValue({ contrato_plano_completo: enabled }, { emitEvent: false });
    this.aplicarMaster(enabled);
  }

  onPlanoCompletoChange(): void {
    const enabled = this.form.get('contrato_plano_completo')?.value === true;
    this.form.patchValue({ licenca_master: enabled }, { emitEvent: false });
    this.aplicarMaster(enabled);
  }

  private aplicarMaster(master: boolean): void {
    const campos = ['usa_vendas', 'usa_compras', 'usa_estoque', 'usa_financeiro', 'usa_fiscal', 'usa_producao', 'usa_distribuicao_producao'];
    for (const campo of campos) {
      const ctrl = this.form.get(campo);
      if (!ctrl) continue;
      if (master) {
        ctrl.setValue(true, { emitEvent: false });
        ctrl.disable({ emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
      }
    }
  }

  modulosLabel(empresa: Empresa): string[] {
    if (empresa.licenca_master) return ['Master'];
    const tags: string[] = [];
    if (empresa.usa_vendas) tags.push('Vendas');
    if (empresa.usa_compras) tags.push('Compras');
    if (empresa.usa_estoque) tags.push('Estoque');
    if (empresa.usa_distribuicao_producao) tags.push('Distribuição');
    if (empresa.usa_financeiro) tags.push('Financeiro');
    if (empresa.usa_fiscal) tags.push('Fiscal e Contábil');
    if (empresa.usa_producao) tags.push('Produção');
    if (empresa.usa_vendas || empresa.usa_estoque) tags.push('Módulo Loja');
    return tags;
  }

  moduloLojaContratado(): boolean {
    return this.form.get('usa_vendas')?.value === true || this.form.get('usa_estoque')?.value === true;
  }

  indicadoresContrato(): { contratadas: number; usadas: number; disponiveis: number; excedente: number; situacao: string } {
    const raw = this.form.getRawValue();
    const contratadas = Number(raw.contrato_limite_sessoes_simultaneas || this.contratoAtual?.limite_sessoes_simultaneas || this.contratoAtual?.limite_usuarios || 0);
    const usadas = Number(this.contratoAtual?.sessoes_ativas || 0);
    const disponiveis = Math.max(0, contratadas - usadas);
    const excedente = Math.max(0, usadas - contratadas);
    return {
      contratadas,
      usadas,
      disponiveis,
      excedente,
      situacao: excedente > 0 ? 'Acima do limite' : 'Regular',
    };
  }

  usuarioMasterLabel(): string {
    const master = this.contratoAtual?.usuario_master as any;
    if (!master) return 'Nenhum master definido';
    return `${master.nome || master.username} (${master.username})${master.is_active === false ? ' - inativo' : ''}`;
  }

  modulosPorCategoria(categoria: 'BASICO' | 'COMERCIAL'): ModuloSistema[] {
    return this.modulosCatalogo.filter(m => m.categoria === categoria && m.ativo !== false);
  }

  moduloContratado(chave: string): boolean {
    if (this.form.get('contrato_plano_completo')?.value === true) {
      return this.modulosCatalogo.some(m => m.chave === chave && m.categoria === 'COMERCIAL');
    }
    return this.empresaModulos.some(m => m.modulo_chave === chave && m.contratado);
  }

  moduloControlFor(chave: string): string | null {
    const map: Record<string, string> = {
      vendas: 'usa_vendas',
      compras: 'usa_compras',
      estoque: 'usa_estoque',
      financeiro: 'usa_financeiro',
      fiscal: 'usa_fiscal',
      producao: 'usa_producao',
      distribuicao: 'usa_distribuicao_producao',
    };
    return map[chave] || null;
  }

  toggleModuloContratado(chave: string, checked: boolean): void {
    const control = this.moduloControlFor(chave);
    if (!control || this.form.get('contrato_plano_completo')?.value === true) return;
    this.form.get(control)?.setValue(checked);
    const found = this.empresaModulos.find(m => m.modulo_chave === chave);
    if (found) found.contratado = checked;
  }

  alternarAtivo(row: Empresa): void {
    if (!row.id) return;
    this.api.patch(row.id, { ativo: row.ativo === false }).subscribe({
      next: () => this.load(),
      error: () => this.errorMsg = 'Não foi possível alterar o status da empresa.'
    });
  }

  excluir(row: Empresa): void {
    if (!row.id) return;
    this.excluirModal = row;
  }

  confirmarExclusao(): void {
    const row = this.excluirModal;
    if (!row?.id) return;
    this.api.remove(row.id).subscribe({
      next: () => {
        this.excluirModal = null;
        this.setSuccess('Empresa excluída.');
        this.load();
      },
      error: () => this.errorMsg = 'Não foi possível excluir. Pode haver lojas ou usuários vinculados.'
    });
  }

  fecharExclusao(): void {
    this.excluirModal = null;
  }

  abrirSuspender(row: Empresa): void {
    this.suspenderModal = row;
    this.suspensaoMotivo = 'INADIMPLENCIA';
    this.suspensaoObservacao = '';
    this.suspensaoConfirmacao = '';
  }

  confirmarSuspensao(): void {
    const row = this.suspenderModal;
    if (!row?.id) return;
    this.api.suspender(row.id, {
      motivo: this.suspensaoMotivo,
      observacao: this.suspensaoObservacao,
      confirmacao: this.suspensaoConfirmacao,
    }).subscribe({
      next: () => {
        this.suspenderModal = null;
        this.setSuccess('Acesso da empresa suspenso.');
        this.load();
      },
      error: (err) => this.errorMsg = this.errorText(err),
    });
  }

  abrirReativar(row: Empresa): void {
    this.reativarModal = row;
  }

  confirmarReativacao(): void {
    const row = this.reativarModal;
    if (!row?.id) return;
    this.api.reativar(row.id).subscribe({
      next: () => {
        this.reativarModal = null;
        this.setSuccess('Acesso da empresa reativado.');
        this.load();
      },
      error: (err) => this.errorMsg = this.errorText(err),
    });
  }

  onPageSizeChange(size: string): void {
    this.pageSize = Number(size) || 20;
    this.page = 1;
    this.applyPage();
  }

  firstPage(): void { this.page = 1; this.applyPage(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.applyPage(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.applyPage(); } }
  lastPage(): void { this.page = this.totalPages; this.applyPage(); }

  private filterRows(rows: Empresa[]): Empresa[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(e =>
      (e.nome || '').toLowerCase().includes(q) ||
      (e.nome_fantasia || '').toLowerCase().includes(q) ||
      (e.documento || '').toLowerCase().includes(q)
    );
  }

  private applyPage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.empresas = this.empresasAll.slice(start, start + this.pageSize);
  }

  private blankToNull(value: any): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private errorText(err: any): string {
    if (err?.status === 403) return 'Você não tem permissão para cadastrar empresa.';
    if (err?.status === 401) return 'Sessão expirada. Faça login novamente.';
    const data = err?.error;
    if (!data) return 'Não foi possível salvar a empresa.';
    if (typeof data === 'string') return data;
    const firstKey = Object.keys(data)[0];
    const value = firstKey ? data[firstKey] : null;
    if (Array.isArray(value)) return `${firstKey}: ${value.join(', ')}`;
    if (value) return `${firstKey}: ${value}`;
    return 'Não foi possível salvar a empresa.';
  }

  private loadModulosCatalogo(): void {
    this.accessApi.modulos().subscribe({
      next: (res: any) => this.modulosCatalogo = Array.isArray(res) ? res : (res?.results ?? []),
      error: () => this.modulosCatalogo = [],
    });
  }

  private loadContrato(empresaId: number): void {
    this.api.getContrato(empresaId).subscribe({
      next: (contrato) => {
        this.contratoAtual = contrato;
        this.empresaModulos = contrato.modulos_contratados || [];
        const contracted = new Set(this.empresaModulos.filter(m => m.contratado).map(m => m.modulo_chave));
        this.form.patchValue({
          contrato_status: contrato.status,
          contrato_data_inicio: contrato.data_inicio || this.today(),
          contrato_data_fim: contrato.data_fim || '',
          contrato_limite_sessoes_simultaneas: contrato.limite_sessoes_simultaneas || contrato.limite_usuarios,
          contrato_plano_completo: contrato.plano_completo === true,
          contrato_observacoes: contrato.observacoes || '',
          licenca_master: contrato.plano_completo === true,
          usa_vendas: contracted.has('vendas'),
          usa_compras: contracted.has('compras'),
          usa_estoque: contracted.has('estoque'),
          usa_financeiro: contracted.has('financeiro'),
          usa_fiscal: contracted.has('fiscal'),
          usa_producao: contracted.has('producao'),
          usa_distribuicao_producao: contracted.has('distribuicao'),
        });
        this.aplicarMaster(contrato.plano_completo === true);
      },
      error: () => {
        this.contratoAtual = null;
        this.empresaModulos = [];
      }
    });
  }

  private contratoPayload(raw: any): Partial<EmpresaContrato> {
    return {
      status: raw.contrato_status,
      data_inicio: raw.contrato_data_inicio || this.today(),
      data_fim: this.blankToNull(raw.contrato_data_fim),
      limite_sessoes_simultaneas: Number(raw.contrato_limite_sessoes_simultaneas || 0),
      plano_completo: raw.contrato_plano_completo === true,
      observacoes: raw.contrato_observacoes || '',
    };
  }

  private finalizarSalvar(): void {
    this.saving = false;
    this.setSuccess(this.editingId ? 'Empresa e contrato atualizados.' : 'Empresa e contrato cadastrados.');
    this.search = '';
    this.cancelar();
    this.load();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private setSuccess(message: string): void {
    this.successMsg = message;
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => {
      this.successMsg = '';
      this.successTimer = null;
    }, 3500);
  }
}
