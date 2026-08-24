import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdemServico } from '../../core/models/requisicao';
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
  private fb = inject(FormBuilder);

  rows: OrdemServico[] = [];
  lojas: { id: number; label: string }[] = [];
  selected: OrdemServico | null = null;
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

  ngOnInit(): void {
    this.carregar();
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

  private toLocalInput(value: string | null): string {
    return value ? value.slice(0, 16) : '';
  }

  private arrayOrResults<T>(data: any): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data?.results && Array.isArray(data.results)) return data.results as T[];
    return [];
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
