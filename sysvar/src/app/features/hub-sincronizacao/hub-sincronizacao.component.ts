import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subscription, catchError, finalize, interval, startWith, switchMap } from 'rxjs';

import { HubAtivacaoCriada, HubComandoAdministrativo, HubConfigurarTerminalPayload, HubSincronizacaoLoja, HubTerminalOperacional } from '../../core/models/hub-sincronizacao';
import { HubSincronizacaoService } from '../../core/services/hub-sincronizacao.service';

@Component({
  selector: 'app-hub-sincronizacao',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './hub-sincronizacao.component.html',
  styleUrls: ['./hub-sincronizacao.component.css'],
})
export class HubSincronizacaoComponent implements OnInit, OnDestroy {
  private api = inject(HubSincronizacaoService);
  private polling?: Subscription;

  linhas: HubSincronizacaoLoja[] = [];
  loading = false;
  syncingAll = false;
  syncingLojaId: number | null = null;
  actionKey: string | null = null;
  errorMsg = '';
  successMsg = '';
  codigoGerado: HubAtivacaoCriada | null = null;
  hubDetalhe: HubSincronizacaoLoja | null = null;
  configuracaoHub: HubSincronizacaoLoja | null = null;
  codigoPareamento: HubComandoAdministrativo | null = null;
  formTerminal: HubConfigurarTerminalPayload = { codigo: '', nome: '', caixa_retaguarda_id: null, hostname: '' };

  ngOnInit(): void {
    this.polling = interval(10000).pipe(
      startWith(0),
      switchMap(() => {
        this.loading = this.linhas.length === 0;
        return this.api.listarAdministracao().pipe(
          catchError(() => {
            this.errorMsg = 'Não foi possível carregar o painel administrativo do Hub.';
            return EMPTY;
          }),
          finalize(() => this.loading = false),
        );
      }),
    ).subscribe({
      next: linhas => {
        this.linhas = linhas;
        if (this.errorMsg === 'Não foi possível carregar o painel administrativo do Hub.') {
          this.errorMsg = '';
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  sincronizarTodas(): void {
    this.syncingAll = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.sincronizarTodas().pipe(
      finalize(() => this.syncingAll = false),
    ).subscribe({
      next: res => {
        this.successMsg = `${res.criadas} solicitação(ões) criada(s).`;
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar sincronização.'),
    });
  }

  sincronizarLoja(linha: HubSincronizacaoLoja): void {
    this.syncingLojaId = linha.loja_id;
    this.errorMsg = '';
    this.successMsg = '';
    this.api.sincronizarLoja(linha.loja_id).pipe(
      finalize(() => this.syncingLojaId = null),
    ).subscribe({
      next: () => {
        this.successMsg = 'Sincronização solicitada.';
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar sincronização da loja.'),
    });
  }

  gerarAtivacao(linha: HubSincronizacaoLoja): void {
    const key = this.key('ativar', linha.loja_id);
    this.actionKey = key;
    this.limparMensagens();
    this.api.gerarAtivacao(linha.loja_id).pipe(
      finalize(() => this.actionKey = null),
    ).subscribe({
      next: ativacao => {
        this.codigoGerado = ativacao;
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível gerar o código de ativação.'),
    });
  }

  revogarAtivacao(linha: HubSincronizacaoLoja): void {
    const ativacao = linha.ativacao_pendente;
    if (!ativacao) return;
    const key = this.key('revogar', linha.loja_id);
    this.actionKey = key;
    this.limparMensagens();
    this.api.revogarAtivacao(ativacao.id).pipe(
      finalize(() => this.actionKey = null),
    ).subscribe({
      next: () => {
        this.successMsg = 'Ativação revogada.';
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível revogar a ativação.'),
    });
  }

  desativarHub(linha: HubSincronizacaoLoja): void {
    if (!linha.hub_id || !window.confirm(`Desativar o Hub da loja ${linha.loja_nome}? O vínculo e a credencial serão preservados.`)) return;
    this.executarAcaoHub(linha, 'desativar', 'Hub desativado.', 'Não foi possível desativar o Hub.');
  }

  reativarHub(linha: HubSincronizacaoLoja): void {
    if (!linha.hub_id) return;
    this.executarAcaoHub(linha, 'reativar', 'Hub reativado.', 'Não foi possível reativar o Hub.');
  }

  desvincularHub(linha: HubSincronizacaoLoja): void {
    if (!linha.hub_id) return;
    const mensagem = [
      `Desvincular o Hub da loja ${linha.loja_nome}?`,
      'A credencial atual será invalidada.',
      'O histórico será preservado.',
      'Será necessária uma nova ativação para conectar novamente.',
    ].join('\n');
    if (!window.confirm(mensagem)) return;
    this.executarAcaoHub(linha, 'desvincular', 'Hub desvinculado. Gere uma nova ativação para conectar novamente.', 'Não foi possível desvincular o Hub.');
  }

  copiarCodigo(): void {
    if (!this.codigoGerado?.codigo) return;
    if (!navigator?.clipboard?.writeText) {
      this.errorMsg = 'Não foi possível copiar automaticamente. Selecione o código e copie manualmente.';
      return;
    }
    navigator.clipboard.writeText(this.codigoGerado.codigo).then(
      () => this.successMsg = 'Código copiado.',
      () => this.errorMsg = 'Não foi possível copiar automaticamente. Selecione o código e copie manualmente.',
    );
  }

  fecharCodigoAtivacao(): void {
    this.codigoGerado = null;
  }

  abrirConfiguracao(linha: HubSincronizacaoLoja): void {
    if (!this.podeConfigurar(linha)) return;
    const terminal = this.terminalPreferencial(linha);
    this.configuracaoHub = linha;
    this.formTerminal = {
      codigo: terminal?.codigo || '',
      nome: terminal?.nome || '',
      caixa_retaguarda_id: terminal?.caixa?.id || linha.caixas?.[0]?.id || null,
      hostname: terminal?.hostname || '',
    };
  }

  fecharConfiguracao(): void {
    this.configuracaoHub = null;
  }

  salvarConfiguracao(): void {
    if (!this.configuracaoHub?.hub_id) return;
    const hubId = this.configuracaoHub.hub_id;
    this.actionKey = this.key('configurar', this.configuracaoHub.loja_id);
    this.limparMensagens();
    this.api.configurarTerminal(hubId, this.formTerminal).pipe(
      finalize(() => this.actionKey = null),
    ).subscribe({
      next: () => {
        this.fecharConfiguracao();
        this.successMsg = 'Configuração enviada ao Hub.';
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar configuração do terminal.'),
    });
  }

  solicitarPareamento(linha: HubSincronizacaoLoja): void {
    if (!linha.hub_id || !this.podeGerarPareamento(linha)) return;
    const terminal = this.terminalPreferencial(linha);
    const payload = { terminal_uuid: terminal?.terminal_uuid || null, codigo: terminal?.codigo || null };
    this.actionKey = this.key('parear', linha.loja_id);
    this.limparMensagens();
    this.api.gerarPareamento(linha.hub_id, payload).pipe(
      finalize(() => this.actionKey = null),
    ).subscribe({
      next: comando => {
        if (comando.status === 'CONCLUIDO') {
          this.codigoPareamento = comando;
        } else {
          this.successMsg = 'Pareamento solicitado ao Hub.';
        }
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, 'Não foi possível solicitar código de pareamento.'),
    });
  }

  fecharPareamento(): void {
    this.codigoPareamento = null;
  }

  copiarPareamento(): void {
    const codigo = this.codigoPareamento?.resultado?.['codigo'];
    if (!codigo || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(codigo).then(
      () => this.successMsg = 'Código copiado.',
      () => this.errorMsg = 'Não foi possível copiar automaticamente.',
    );
  }

  podeSincronizar(linha: HubSincronizacaoLoja): boolean {
    return linha.hub_ativo && linha.possui_credencial && linha.sincronizacao_status !== 'PENDENTE' && linha.sincronizacao_status !== 'PROCESSANDO';
  }

  situacaoTexto(linha: HubSincronizacaoLoja): string {
    if (!linha.hub_id) return 'Sem Hub';
    if (!linha.possui_credencial) return 'Hub desvinculado';
    if (!linha.hub_ativo) return 'Hub desativado';
    if (linha.status_visual === 'VERDE') return 'Sincronizado';
    if (linha.status_visual === 'AMARELO') return linha.sincronizacao_status === 'PROCESSANDO' ? 'Sincronizando' : 'Aguardando';
    return linha.sincronizacao_status === 'ERRO' ? 'Erro' : 'Não sincronizado';
  }

  hubSituacaoTexto(linha: HubSincronizacaoLoja): string {
    if (!linha.hub_id) return 'Sem Hub';
    if (!linha.possui_credencial) return 'Hub desvinculado';
    return linha.hub_ativo ? 'Hub ativo' : 'Hub desativado';
  }

  hubSituacaoClasse(linha: HubSincronizacaoLoja): string {
    if (!linha.hub_id) return 'muted';
    if (!linha.possui_credencial) return 'muted';
    return linha.hub_ativo ? 'ok' : 'bad';
  }

  ultimaSincronizacao(linha: HubSincronizacaoLoja): string | null {
    return linha.concluido_em || linha.iniciado_em || linha.solicitado_em;
  }

  acaoEmAndamento(acao: string, lojaId: number): boolean {
    return this.actionKey === this.key(acao, lojaId);
  }

  mostrarAtivacao(linha: HubSincronizacaoLoja): boolean {
    return !linha.hub_id || !linha.possui_credencial || !!linha.ativacao_pendente;
  }

  ativacaoTexto(linha: HubSincronizacaoLoja): string {
    if (linha.hub_id && linha.possui_credencial) return 'Ativado ✓';
    if (linha.ativacao_pendente) return linha.ativacao_pendente.estado;
    return 'Gerar código de ativação';
  }

  configuracaoTexto(linha: HubSincronizacaoLoja): string {
    const estado = linha.configuracao_estado || 'NAO_DISPONIVEL';
    const labels: Record<string, string> = {
      NAO_DISPONIVEL: 'Não disponível',
      NAO_CONFIGURADO: 'Não configurado',
      AGUARDANDO: 'Aguardando',
      CONFIGURANDO: 'Configurando',
      CONFIGURADO: (linha.total_terminais || 0) > 1 ? `${linha.total_terminais} configurados` : 'Configurado ✓',
      ERRO: 'Erro',
    };
    return labels[estado] || estado;
  }

  pareamentoResumo(linha: HubSincronizacaoLoja): string {
    const estado = linha.pareamento_estado || 'NAO_DISPONIVEL';
    if (estado === 'PAREADO') {
      return (linha.total_terminais || 0) > 1 ? `${linha.terminais_pareados || 0}/${linha.total_terminais || 0} pareados` : 'Pareado ✓';
    }
    const labels: Record<string, string> = {
      NAO_DISPONIVEL: 'Não disponível',
      NAO_PAREADO: 'Não pareado',
      CODIGO_SOLICITADO: 'Código solicitado',
      CODIGO_DISPONIVEL: 'Código disponível',
      ERRO: 'Erro',
    };
    return labels[estado] || estado;
  }

  podeConfigurar(linha: HubSincronizacaoLoja): boolean {
    return !!linha.hub_id && linha.hub_ativo && linha.possui_credencial;
  }

  podeGerarPareamento(linha: HubSincronizacaoLoja): boolean {
    return this.podeConfigurar(linha) && (linha.total_terminais || 0) > 0 && linha.pareamento_estado !== 'PAREADO';
  }

  podeReativar(linha: HubSincronizacaoLoja): boolean {
    return !!linha.hub_id && !linha.hub_ativo && linha.possui_credencial;
  }

  podeDesvincular(linha: HubSincronizacaoLoja): boolean {
    return !!linha.hub_id && linha.possui_credencial;
  }

  abrirDetalhesHub(linha: HubSincronizacaoLoja): void {
    if (!linha.hub_id) return;
    this.hubDetalhe = linha;
  }

  fecharDetalhesHub(): void {
    this.hubDetalhe = null;
  }

  terminalEstadoTexto(terminal: HubTerminalOperacional): string {
    return terminal.online ? 'Online' : 'Offline';
  }

  terminalEstadoClasse(terminal: HubTerminalOperacional): string {
    return terminal.online ? 'ok' : 'bad';
  }

  pareamentoTexto(terminal: HubTerminalOperacional): string {
    return terminal.pareado ? 'Pareado' : 'Não pareado';
  }

  caixaStatusTexto(status: string): string {
    const labels: Record<string, string> = {
      ABERTO: 'Caixa aberto',
      FECHADO: 'Caixa fechado',
      SEM_CAIXA: 'Sem caixa',
      CAIXA_NAO_ENCONTRADO: 'Caixa não encontrado',
    };
    return labels[status] || status || '-';
  }

  caixaStatusClasse(status: string): string {
    if (status === 'ABERTO') return 'ok';
    if (status === 'FECHADO' || status === 'SEM_CAIXA') return 'muted';
    return 'bad';
  }

  private terminalPreferencial(linha: HubSincronizacaoLoja): HubTerminalOperacional | null {
    return linha.snapshot_operacional?.terminais?.[0] || null;
  }

  private recarregar(): void {
    this.api.listarAdministracao().subscribe({
      next: linhas => this.linhas = linhas,
      error: () => {},
    });
  }

  private executarAcaoHub(linha: HubSincronizacaoLoja, acao: 'desativar' | 'reativar' | 'desvincular', sucesso: string, erro: string): void {
    if (!linha.hub_id) return;
    const key = this.key(acao, linha.loja_id);
    this.actionKey = key;
    this.limparMensagens();
    const request = acao === 'desativar'
      ? this.api.desativarHub(linha.hub_id)
      : acao === 'reativar'
        ? this.api.reativarHub(linha.hub_id)
        : this.api.desvincularHub(linha.hub_id);
    request.pipe(
      finalize(() => this.actionKey = null),
    ).subscribe({
      next: () => {
        this.successMsg = sucesso;
        this.recarregar();
      },
      error: err => this.errorMsg = this.backendError(err, erro),
    });
  }

  private limparMensagens(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private key(acao: string, lojaId: number): string {
    return `${acao}:${lojaId}`;
  }

  private backendError(err: any, fallback: string): string {
    const data = err?.error;
    if (typeof data?.detail === 'string') return data.detail;
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0] as any;
      if (Array.isArray(first) && first.length) return String(first[0]);
      if (typeof first === 'string') return first;
    }
    return fallback;
  }
}
