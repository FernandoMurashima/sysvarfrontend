import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Cotacao, CotacaoTipoCompra } from '../../core/models/cotacao';
import { CotacoesService } from '../../core/services/cotacoes.service';

type Option = { id: number; label: string };

@Component({
  selector: 'app-cotacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cotacoes.component.html',
  styleUrls: ['./cotacoes.component.css'],
})
export class CotacoesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(CotacoesService);
  private auth = inject(AuthService);

  view: 'list' | 'form' = 'list';
  cotacoes: Cotacao[] = [];
  lojas: Option[] = [];
  atual: Cotacao | null = null;
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  form = this.fb.group({
    loja: [null as number | null, Validators.required],
    data_limite_propostas: [''],
    prioridade: ['NORMAL', Validators.required],
    tipo_compra: ['OUTRO' as CotacaoTipoCompra, Validators.required],
    observacao: [''],
  });

  ngOnInit(): void {
    this.loadLojas();
    this.loadCotacoes();
  }

  get podeEditar(): boolean {
    return this.auth.podeAcessarModulo('compras', true) === true;
  }

  get currentUser(): any {
    return this.auth.getCurrentUser();
  }

  loadCotacoes(): void {
    this.loading = true;
    this.api.listar({ page_size: 500 }).subscribe({
      next: resp => {
        this.cotacoes = Array.isArray(resp) ? resp : resp.results || [];
        this.loading = false;
      },
      error: err => {
        this.errorMsg = this.errorText(err, 'Falha ao carregar cotações.');
        this.loading = false;
      },
    });
  }

  loadLojas(): void {
    this.api.lojasPermitidas().subscribe({
      next: resp => {
        this.lojas = (Array.isArray(resp) ? resp : resp.results || [])
          .map(l => ({ id: Number(l.id ?? l.Idloja), label: `${l.id ?? l.Idloja} - ${l.nome_loja}` }))
          .filter(l => !!l.id);
      },
      error: err => this.errorMsg = this.errorText(err, 'Falha ao carregar lojas permitidas.'),
    });
  }

  nova(): void {
    this.atual = null;
    this.form.reset({ loja: null, data_limite_propostas: '', prioridade: 'NORMAL', tipo_compra: 'OUTRO', observacao: '' });
    this.view = 'form';
  }

  abrir(cotacao: Cotacao): void {
    this.atual = cotacao;
    this.form.reset({
      loja: cotacao.loja,
      data_limite_propostas: cotacao.data_limite_propostas || '',
      prioridade: cotacao.prioridade || 'NORMAL',
      tipo_compra: cotacao.tipo_compra || 'OUTRO',
      observacao: cotacao.observacao || '',
    });
    this.view = 'form';
  }

  voltar(): void {
    this.view = 'list';
    this.atual = null;
    this.errorMsg = '';
  }

  salvar(): void {
    if (!this.podeEditar || this.form.invalid || this.saving) return;
    this.saving = true;
    this.errorMsg = '';
    const raw = this.form.getRawValue();
    const payload: Partial<Cotacao> = {
      loja: raw.loja || undefined,
      data_limite_propostas: raw.data_limite_propostas || null,
      prioridade: raw.prioridade as any,
      tipo_compra: raw.tipo_compra as CotacaoTipoCompra,
      observacao: raw.observacao || '',
    };
    const req = this.atual ? this.api.atualizar(this.atual.id, payload) : this.api.criar(payload);
    req.subscribe({
      next: cotacao => {
        this.saving = false;
        this.successMsg = 'Cotação salva.';
        this.atual = cotacao;
        this.view = 'list';
        this.loadCotacoes();
      },
      error: err => {
        this.saving = false;
        this.errorMsg = this.errorText(err, 'Falha ao salvar cotação.');
      },
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      EM_ELABORACAO: 'Em elaboração',
      ABERTA: 'Aberta',
      PROPOSTAS_RECEBIDAS: 'Propostas recebidas',
      EM_ANALISE: 'Em análise',
      AGUARDANDO_APROVACAO: 'Aguardando aprovação',
      APROVADA: 'Aprovada',
      REJEITADA: 'Rejeitada',
      CANCELADA: 'Cancelada',
      PEDIDO_GERADO: 'Pedido gerado',
      ENCERRADA: 'Encerrada',
    };
    return labels[status || 'EM_ELABORACAO'] || status || '';
  }

  tipoLabel(tipo?: string): string {
    const labels: Record<string, string> = { REVENDA: 'Revenda', USO_CONSUMO: 'Uso/Consumo', INSUMO: 'Insumo', SERVICO: 'Serviço', OUTRO: 'Outro' };
    return labels[tipo || 'OUTRO'] || tipo || '';
  }

  private errorText(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.detail) return err.error.detail;
    const first = err?.error && Object.values(err.error)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (first) return String(first);
    return fallback;
  }
}
