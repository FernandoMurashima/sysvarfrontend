import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { AgenteLocalSysvar, CodigoAtivacaoAgenteLocal, ConfiguracaoXmlFornecedor } from '../../core/models/agente-local';
import { Loja } from '../../core/models/loja';
import { AgenteLocalService } from '../../core/services/agente-local.service';
import { LojasService } from '../../core/services/lojas.service';

@Component({
  selector: 'app-agente-local',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule],
  templateUrl: './agente-local.component.html',
  styleUrls: ['./agente-local.component.css'],
})
export class AgenteLocalComponent implements OnInit {
  private api = inject(AgenteLocalService);
  private lojasApi = inject(LojasService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  codigoAtual: CodigoAtivacaoAgenteLocal | null = null;
  loading = false;
  loadingPastas = false;
  savingPasta = false;
  errorMsg = '';
  successMsg = '';
  agentes: AgenteLocalSysvar[] = [];
  lojas: Loja[] = [];
  configuracoes: ConfiguracaoXmlFornecedor[] = [];
  modalAberto = false;
  editing: ConfiguracaoXmlFornecedor | null = null;
  submitted = false;

  form = this.fb.group({
    identificador_agente: ['', Validators.required],
    loja: [null as number | null],
    caminho_local: ['', [Validators.required, Validators.maxLength(500)]],
    ativo: [true],
  });

  ngOnInit(): void {
    this.carregarPastas();
  }

  carregarPastas(): void {
    this.loadingPastas = true;
    forkJoin({
      agentes: this.api.listarAgentes(),
      lojas: this.lojasApi.list({ ordering: 'nome_loja', page_size: 500 }),
      configuracoes: this.api.listarConfiguracoes(),
    }).pipe(
      finalize(() => this.loadingPastas = false),
    ).subscribe({
      next: ({ agentes, lojas, configuracoes }) => {
        this.agentes = this.unwrap<AgenteLocalSysvar>(agentes);
        this.lojas = this.unwrap<Loja>(lojas);
        this.configuracoes = this.unwrap<ConfiguracaoXmlFornecedor>(configuracoes);
      },
      error: () => this.errorMsg = 'Não foi possível carregar as pastas monitoradas.',
    });
  }

  gerarCodigo(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.gerarCodigoAtivacao().pipe(
      finalize(() => this.loading = false),
    ).subscribe({
      next: (res) => {
        this.codigoAtual = res;
        this.successMsg = 'Código de ativação gerado.';
      },
      error: (err) => {
        this.codigoAtual = null;
        this.errorMsg = err?.status === 401 || err?.status === 403
          ? 'Você não possui permissão para gerar códigos de ativação.'
          : 'Não foi possível gerar o código de ativação. Tente novamente.';
      },
    });
  }

  copiarCodigo(): void {
    const codigo = this.codigoAtual?.codigo;
    if (!codigo || !navigator?.clipboard?.writeText) {
      this.errorMsg = 'Não foi possível copiar o código automaticamente.';
      return;
    }
    navigator.clipboard.writeText(codigo).then(
      () => {
        this.errorMsg = '';
        this.successMsg = 'Código copiado.';
      },
      () => {
        this.errorMsg = 'Não foi possível copiar o código automaticamente.';
      },
    );
  }

  abrirNovaPasta(): void {
    this.editing = null;
    this.submitted = false;
    this.form.reset({ identificador_agente: '', loja: null, caminho_local: '', ativo: true });
    this.modalAberto = true;
  }

  editarPasta(config: ConfiguracaoXmlFornecedor): void {
    this.editing = config;
    this.submitted = false;
    this.form.reset({
      identificador_agente: config.identificador_agente,
      loja: config.loja ?? null,
      caminho_local: config.caminho_local,
      ativo: config.ativo,
    });
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.editing = null;
    this.submitted = false;
  }

  salvarPasta(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMsg = 'Informe o agente e a pasta local.';
      return;
    }
    const empresa = this.empresaAtualId();
    if (!empresa) {
      this.errorMsg = 'Não foi possível identificar a empresa atual.';
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      empresa,
      loja: raw.loja || null,
      caminho_local: String(raw.caminho_local || '').trim(),
      ativo: raw.ativo !== false,
      identificador_agente: String(raw.identificador_agente || '').trim(),
    };
    this.savingPasta = true;
    this.errorMsg = '';
    const request$ = this.editing
      ? this.api.atualizarConfiguracao(this.editing.id, payload)
      : this.api.criarConfiguracao(payload);
    request$.pipe(
      finalize(() => this.savingPasta = false),
    ).subscribe({
      next: () => {
        this.successMsg = this.editing ? 'Configuração atualizada.' : 'Configuração salva.';
        this.fecharModal();
        this.carregarPastas();
      },
      error: (err) => this.errorMsg = this.backendError(err, 'Não foi possível salvar a configuração.'),
    });
  }

  alternarAtivo(config: ConfiguracaoXmlFornecedor): void {
    this.errorMsg = '';
    this.api.atualizarConfiguracao(config.id, { ativo: !config.ativo }).subscribe({
      next: () => {
        this.successMsg = config.ativo ? 'Configuração desativada.' : 'Configuração atualizada.';
        this.carregarPastas();
      },
      error: (err) => this.errorMsg = this.backendError(err, 'Não foi possível salvar a configuração.'),
    });
  }

  agenteLabel(identificador: string): string {
    const agente = this.agentes.find(item => item.identificador === identificador);
    if (!agente) return identificador || 'Agente não informado';
    return [agente.nome || agente.identificador, agente.hostname].filter(Boolean).join(' - ');
  }

  lojaNome(id?: number | null, fallback?: string | null): string {
    if (!id) return 'Empresa inteira';
    return fallback || this.lojas.find(loja => Number(loja.id ?? loja.Idloja) === Number(id))?.nome_loja || `Estabelecimento #${id}`;
  }

  private empresaAtualId(): number | null {
    const user = this.auth.getCurrentUser();
    return Number(user?.Idempresa || user?.empresa?.id || 0) || null;
  }

  private unwrap<T>(resp: T[] | { results: T[] }): T[] {
    return Array.isArray(resp) ? resp : (resp?.results ?? []);
  }

  private backendError(err: any, fallback: string): string {
    const data = err?.error;
    if (!data || typeof data !== 'object') return fallback;
    const first = Object.values(data)[0] as any;
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === 'string') return first;
    if (typeof data.detail === 'string') return data.detail;
    return fallback;
  }
}
