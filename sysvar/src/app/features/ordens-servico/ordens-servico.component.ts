import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Produto } from '../../core/models/produto';
import { OrdemServico, OrdemServicoMaterial } from '../../core/models/requisicao';
import { ProdutosService } from '../../core/services/produtos.service';
import { RequisicoesService } from '../../core/services/requisicoes.service';

@Component({
  selector: 'app-ordens-servico',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ordens-servico.component.html',
  styleUrls: ['../setores/setores.component.css'],
})
export class OrdensServicoComponent implements OnInit {
  private api = inject(RequisicoesService);
  private produtosApi = inject(ProdutosService);
  private fb = inject(FormBuilder);

  rows: OrdemServico[] = [];
  lojas: { id: number; label: string }[] = [];
  produtos: Produto[] = [];
  selected: OrdemServico | null = null;
  editingMaterial: OrdemServicoMaterial | null = null;
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';
  filtroStatus = '';
  filtroTipo = '';
  filtroLoja: number | '' = '';
  filtroResponsavel = '';

  form = this.fb.group({
    status: ['ABERTA'],
    responsavel: [null as number | null],
    diagnostico: [''],
    solucao: [''],
    previsao_atendimento: [''],
    data_inicio: [''],
    observacoes: [''],
  });

  materialForm = this.fb.group({
    produto: [null as number | null],
    descricao: [''],
    qtd_necessaria: ['1'],
    observacoes: [''],
  });

  ngOnInit(): void {
    this.carregar();
    this.produtosApi.list({ tipo_produto: '2', ativo: 'true', page_size: 100 }).subscribe(resp => {
      this.produtos = this.arrayOrResults<Produto>(resp);
    });
    this.api.lojasPermitidas().subscribe(resp => {
      this.lojas = this.arrayOrResults<any>(resp).map(l => ({ id: Number(l.id ?? l.Idloja), label: l.nome_loja || l.apelido_loja || String(l.id ?? l.Idloja) })).filter(l => !!l.id);
    });
  }

  carregar(): void {
    this.loading = true;
    const params: any = {};
    if (this.filtroStatus) params.status = this.filtroStatus;
    if (this.filtroTipo) params.tipo = this.filtroTipo;
    if (this.filtroLoja) params.loja = this.filtroLoja;
    if (this.filtroResponsavel) params.responsavel = this.filtroResponsavel;
    this.api.listarOrdensServico(params).subscribe({
      next: resp => {
        this.rows = this.arrayOrResults<OrdemServico>(resp);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao carregar ordens de serviço.').join(' ');
      },
    });
  }

  abrir(row: OrdemServico): void {
    this.api.getOrdemServico(row.id).subscribe({
      next: os => {
        this.selected = os;
        this.editingMaterial = null;
        this.materialForm.reset({ produto: null, descricao: '', qtd_necessaria: '1', observacoes: '' });
        this.form.reset({
          status: os.status,
          responsavel: os.responsavel,
          diagnostico: os.diagnostico || '',
          solucao: os.solucao || '',
          previsao_atendimento: this.toLocalInput(os.previsao_atendimento),
          data_inicio: this.toLocalInput(os.data_inicio),
          observacoes: os.observacoes || '',
        });
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao abrir ordem de serviço.').join(' '),
    });
  }

  salvar(): void {
    if (!this.selected) return;
    this.saving = true;
    const raw = this.form.getRawValue();
    this.api.atualizarOrdemServico(this.selected.id, {
      status: raw.status as OrdemServico['status'],
      responsavel: raw.responsavel || null,
      diagnostico: raw.diagnostico || '',
      solucao: raw.solucao || '',
      previsao_atendimento: raw.previsao_atendimento || null,
      data_inicio: raw.data_inicio || null,
      observacoes: raw.observacoes || '',
    }).subscribe({
      next: os => {
        this.selected = os;
        this.saving = false;
        this.successMsg = 'Ordem de serviço atualizada.';
        this.errorMsg = '';
        this.carregar();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.extractMessages(err, 'Falha ao salvar ordem de serviço.').join(' ');
      },
    });
  }

  salvarMaterial(): void {
    if (!this.selected) return;
    const raw = this.materialForm.getRawValue();
    const payload: Partial<OrdemServicoMaterial> = {
      ordem_servico: this.selected.id,
      produto: raw.produto || null,
      descricao: raw.descricao || '',
      qtd_necessaria: raw.qtd_necessaria || '0',
      observacoes: raw.observacoes || '',
    };
    const req = this.editingMaterial
      ? this.api.atualizarMaterialOrdemServico(this.editingMaterial.id, payload)
      : this.api.criarMaterialOrdemServico(payload);
    req.subscribe({
      next: () => {
        this.successMsg = this.editingMaterial ? 'Material atualizado.' : 'Material adicionado.';
        this.errorMsg = '';
        this.abrir(this.selected!);
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao salvar material.').join(' '),
    });
  }

  editarMaterial(material: OrdemServicoMaterial): void {
    this.editingMaterial = material;
    this.materialForm.reset({
      produto: material.produto,
      descricao: material.descricao || '',
      qtd_necessaria: String(material.qtd_necessaria || '0'),
      observacoes: material.observacoes || '',
    });
  }

  removerMaterial(material: OrdemServicoMaterial): void {
    this.api.removerMaterialOrdemServico(material.id).subscribe({
      next: () => {
        this.successMsg = 'Material removido.';
        this.errorMsg = '';
        this.abrir(this.selected!);
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao remover material.').join(' '),
    });
  }

  atenderMaterial(material: OrdemServicoMaterial): void {
    const disponivel = Math.max(0, this.asNumber(material.estoque_disponivel));
    const pendente = Math.max(0, this.asNumber(material.qtd_pendente));
    const quantidade = Math.min(disponivel, pendente);
    if (!quantidade) return;
    this.api.atenderMaterialOrdemServico(material.id, quantidade).subscribe({
      next: () => {
        this.successMsg = 'Material atendido.';
        this.errorMsg = '';
        this.abrir(this.selected!);
      },
      error: err => this.errorMsg = this.extractMessages(err, 'Falha ao atender material.').join(' '),
    });
  }

  cancelarEdicaoMaterial(): void {
    this.editingMaterial = null;
    this.materialForm.reset({ produto: null, descricao: '', qtd_necessaria: '1', observacoes: '' });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      ABERTA: 'Aberta',
      EM_TRIAGEM: 'Em triagem',
      EM_ATENDIMENTO: 'Em atendimento',
      AGUARDANDO_MATERIAL: 'Aguardando material',
      AGUARDANDO_TERCEIRO: 'Aguardando terceiro',
      CONCLUIDA: 'Concluída',
      CANCELADA: 'Cancelada',
    };
    return labels[status] || status;
  }

  tipoLabel(tipo: string): string {
    return tipo === 'MANUTENCAO' ? 'Manutenção' : tipo;
  }

  produtoLabel(produto: Produto): string {
    return produto.descricao || produto.referencia || String(produto.Idproduto);
  }

  materialStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      DISPONIVEL: 'Disponível',
      EM_COMPRA: 'Em compra',
      ATENDIDA: 'Atendida',
      CANCELADA: 'Cancelada',
    };
    return labels[status] || status;
  }

  podeEditarMaterial(material: OrdemServicoMaterial): boolean {
    return this.asNumber(material.qtd_atendida) === 0 && !['ATENDIDA', 'CANCELADA'].includes(material.status);
  }

  podeAtenderMaterial(material: OrdemServicoMaterial): boolean {
    return !!material.produto && this.asNumber(material.estoque_disponivel) > 0 && this.asNumber(material.qtd_pendente) > 0 && !['ATENDIDA', 'CANCELADA'].includes(material.status);
  }

  private toLocalInput(value: string | null): string {
    return value ? value.slice(0, 16) : '';
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data?.results && Array.isArray(data.results)) return data.results as T[];
    return [];
  }

  private asNumber(value: string | number | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractMessages(err: any, fallback: string): string[] {
    const data = err?.error;
    if (!data) return [fallback];
    if (typeof data === 'string') return [data];
    if (Array.isArray(data)) return data.map(String);
    if (typeof data === 'object') {
      const out: string[] = [];
      Object.entries(data).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach(v => out.push(key === 'detail' ? String(v) : `${key}: ${v}`));
      });
      return out.length ? out : [fallback];
    }
    return [fallback];
  }
}
