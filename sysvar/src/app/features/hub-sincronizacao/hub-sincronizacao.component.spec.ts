import { ComponentFixture, TestBed } from '@angular/core/testing';
import { discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HubAtivacaoCriada, HubSincronizacaoLoja } from '../../core/models/hub-sincronizacao';
import { HubSincronizacaoService } from '../../core/services/hub-sincronizacao.service';
import { HubSincronizacaoComponent } from './hub-sincronizacao.component';

describe('HubSincronizacaoComponent', () => {
  let fixture: ComponentFixture<HubSincronizacaoComponent>;
  let api: jasmine.SpyObj<HubSincronizacaoService>;

  const linha = (overrides: Partial<HubSincronizacaoLoja> = {}): HubSincronizacaoLoja => ({
    loja_id: 1,
    loja_nome: 'Loja',
    empresa_id: 1,
    hub_id: 1,
    hub_uuid: 'uuid',
    hub_nome: 'Hub Loja',
    hub_ativo: true,
    possui_credencial: true,
    hostname: 'HOST',
    versao: '1',
    ultimo_ip: null,
    ultimo_contato: null,
    sincronizacao_id: null,
    sincronizacao_status: '',
    solicitado_em: null,
    iniciado_em: null,
    concluido_em: null,
    etapa_atual: '',
    mensagem_erro: '',
    status_visual: 'VERMELHO',
    ativacao_pendente: null,
    ...overrides,
  });

  beforeEach(async () => {
    api = jasmine.createSpyObj<HubSincronizacaoService>('HubSincronizacaoService', [
      'listarPainel',
      'listarAdministracao',
      'gerarAtivacao',
      'revogarAtivacao',
      'desativarHub',
      'reativarHub',
      'desvincularHub',
      'sincronizarLoja',
      'sincronizarTodas',
    ]);
    api.listarPainel.and.returnValue(of([]));
    api.listarAdministracao.and.returnValue(of([]));
    api.gerarAtivacao.and.returnValue(of({ codigo: 'ABCD-EFGH-IJKL' } as HubAtivacaoCriada));
    api.revogarAtivacao.and.returnValue(of({} as any));
    api.desativarHub.and.returnValue(of({} as any));
    api.reativarHub.and.returnValue(of({} as any));
    api.desvincularHub.and.returnValue(of({} as any));
    api.sincronizarLoja.and.returnValue(of({} as any));
    api.sincronizarTodas.and.returnValue(of({ criadas: 1, ja_pendentes: 0, ignoradas_sem_hub: 0, ignoradas_inativas: 0, solicitacoes: [] }));

    await TestBed.configureTestingModule({
      imports: [HubSincronizacaoComponent],
      providers: [{ provide: HubSincronizacaoService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(HubSincronizacaoComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.componentInstance.ngOnDestroy());

  it('deve carregar painel administrativo ao iniciar', () => {
    expect(api.listarAdministracao).toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Administração do Sysvar Hub');
  });

  it('deve solicitar sincronizacao da loja', () => {
    fixture.componentInstance.sincronizarLoja(linha());
    expect(api.sincronizarLoja).toHaveBeenCalledWith(1);
  });

  it('deve gerar ativacao e exibir codigo recem-gerado', () => {
    const ativacao = {
      id: 10,
      loja_id: 1,
      loja_nome: 'Loja',
      empresa_id: 1,
      codigo_prefixo: 'ABCD',
      codigo: 'ABCD-EFGH-IJKL',
      criada_em: '2026-09-27T10:00:00-03:00',
      expira_em: '2026-09-27T10:15:00-03:00',
      estado: 'PENDENTE',
      hub_id: null,
    } as HubAtivacaoCriada;
    api.gerarAtivacao.and.returnValue(of(ativacao));

    fixture.componentInstance.gerarAtivacao(linha({ hub_id: null }));
    fixture.detectChanges();

    expect(api.gerarAtivacao).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.codigoGerado?.codigo).toBe('ABCD-EFGH-IJKL');
    expect(fixture.nativeElement.textContent).toContain('ABCD-EFGH-IJKL');
  });

  it('deve copiar codigo gerado', fakeAsync(() => {
    const clipboardWrite = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboardWrite } });
    fixture.componentInstance.codigoGerado = { codigo: 'ABCD-EFGH-IJKL' } as HubAtivacaoCriada;

    fixture.componentInstance.copiarCodigo();
    tick();

    expect(clipboardWrite).toHaveBeenCalledOnceWith('ABCD-EFGH-IJKL');
    expect(fixture.componentInstance.successMsg).toBe('Código copiado.');
  }));

  it('deve revogar ativacao pendente', () => {
    fixture.componentInstance.revogarAtivacao(linha({
      ativacao_pendente: {
        id: 5,
        loja_id: 1,
        loja_nome: 'Loja',
        empresa_id: 1,
        codigo_prefixo: 'ABCD',
        criada_em: '2026-09-27T10:00:00-03:00',
        expira_em: '2026-09-27T10:15:00-03:00',
        estado: 'PENDENTE',
        hub_id: null,
      },
    }));

    expect(api.revogarAtivacao).toHaveBeenCalledWith(5);
  });

  it('deve desativar e reativar hub', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.desativarHub(linha());
    fixture.componentInstance.reativarHub(linha({ hub_ativo: false }));

    expect(api.desativarHub).toHaveBeenCalledWith(1);
    expect(api.reativarHub).toHaveBeenCalledWith(1);
  });

  it('deve confirmar antes de desvincular', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.desvincularHub(linha());

    expect(window.confirm).toHaveBeenCalled();
    expect(api.desvincularHub).toHaveBeenCalledWith(1);
  });

  it('deve exibir acoes para hub ativo com credencial', () => {
    fixture.componentInstance.linhas = [linha({
      hub_ativo: true,
      possui_credencial: true,
      status_visual: 'VERDE',
      sincronizacao_status: 'CONCLUIDA',
      ultimo_ip: '127.0.0.1',
      ultimo_contato: '2026-09-28T09:20:00-03:00',
      concluido_em: '2026-09-28T09:21:00-03:00',
    })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sincronizado');
    expect(text).toContain('Hub ativo');
    expect(text).toContain('Sincronizar');
    expect(text).toContain('Desativar');
    expect(text).toContain('Desvincular');
    expect(text).not.toContain('Reativar');
    const actionsCell: HTMLTableCellElement | null = fixture.nativeElement.querySelector('td.actions-col');
    expect(actionsCell).withContext('celula de acoes com largura reservada').not.toBeNull();
    expect(actionsCell?.textContent).toContain('Sincronizar');
    expect(actionsCell?.textContent).toContain('Desativar');
    expect(actionsCell?.textContent).toContain('Desvincular');
    expect(text).toContain('28/09/2026 09:20');
    expect(text).toContain('28/09/2026 09:21');
    expect(text).toContain('127.0.0.1');
    expect(text).not.toContain('Último IP');
    expect(fixture.componentInstance.podeSincronizar(fixture.componentInstance.linhas[0])).toBeTrue();
  });

  it('deve mostrar hub existente como nome clicavel sem expor dados tecnicos na linha', () => {
    fixture.componentInstance.linhas = [linha({
      hub_uuid: 'uuid-tecnico',
      hostname: 'HOST-LOJA',
      versao: '2.1.0',
    })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const hubButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.hub-link');
    expect(hubButton).withContext('nome do hub clicavel').not.toBeNull();
    expect(hubButton?.textContent).toContain('Hub Loja');
    expect(fixture.nativeElement.querySelector('.info-button')).toBeNull();
    expect(text).not.toContain('uuid-tecnico');
    expect(text).not.toContain('Host: HOST-LOJA');
    expect(text).not.toContain('Versão: 2.1.0');
  });

  it('deve abrir e fechar modal com informacoes tecnicas do hub', () => {
    fixture.componentInstance.linhas = [linha({
      loja_nome: 'Loja Barra',
      hub_nome: '',
      hub_uuid: 'bb2c6672-165b-4512-bcb1-3aed8a36102d',
      hostname: 'TakeshiViper',
      versao: '0.1.0',
      ultimo_ip: '127.0.0.1',
      ultimo_contato: '2026-09-28T09:28:00-03:00',
    })];
    fixture.detectChanges();

    const hubButton: HTMLButtonElement = fixture.nativeElement.querySelector('.hub-link');
    hubButton.click();
    fixture.detectChanges();

    const dialog: HTMLElement | null = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).withContext('dialog aberto').not.toBeNull();
    const dialogText = dialog?.textContent || '';
    expect(dialogText).toContain('Informações do Sysvar Hub');
    expect(dialogText).toContain('Loja Barra');
    expect(dialogText).toContain('Sysvar Hub');
    expect(dialogText).toContain('bb2c6672-165b-4512-bcb1-3aed8a36102d');
    expect(dialogText).toContain('TakeshiViper');
    expect(dialogText).toContain('0.1.0');
    expect(dialogText).toContain('127.0.0.1');
    expect(dialogText).toContain('28/09/2026 09:28');

    const closeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.hub-modal footer .btn');
    closeButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('deve exibir reativar e desvincular para hub desativado com credencial', () => {
    fixture.componentInstance.linhas = [linha({ hub_ativo: false, possui_credencial: true })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hub desativado');
    expect(text).toContain('Reativar');
    expect(text).toContain('Desvincular');
    expect(text).not.toContain('Gerar código de ativação');
    expect(fixture.componentInstance.mostrarAtivacao(fixture.componentInstance.linhas[0])).toBeFalse();
    expect(fixture.componentInstance.podeSincronizar(fixture.componentInstance.linhas[0])).toBeFalse();
  });

  it('deve oferecer nova ativacao para hub desvinculado sem credencial', () => {
    fixture.componentInstance.linhas = [linha({ hub_ativo: false, possui_credencial: false })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hub desvinculado');
    expect(text).toContain('Gerar código de ativação');
    expect(text).toContain('Nova ativação necessária.');
    expect(text).not.toContain('Reativar');
    expect(text).not.toContain('Desvincular');
    expect(fixture.componentInstance.podeSincronizar(fixture.componentInstance.linhas[0])).toBeFalse();
  });

  it('deve oferecer ativacao para loja sem hub', () => {
    fixture.componentInstance.linhas = [linha({ hub_id: null, hub_uuid: null, hub_ativo: false, possui_credencial: false })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sem Hub');
    expect(fixture.nativeElement.querySelector('.hub-link')).toBeNull();
    expect(text).toContain('Gerar código de ativação');
    expect(text).not.toContain('Reativar');
    expect(text).not.toContain('Desvincular');
  });

  it('deve formatar datas de ativacao pendente e codigo gerado em formato brasileiro', () => {
    fixture.componentInstance.codigoGerado = {
      id: 10,
      loja_id: 1,
      loja_nome: 'Loja',
      empresa_id: 1,
      codigo_prefixo: 'ABCD',
      codigo: 'ABCD-EFGH-IJKL',
      criada_em: '2026-09-28T09:00:00-03:00',
      expira_em: '2026-09-28T09:20:00-03:00',
      estado: 'PENDENTE',
      hub_id: null,
    } as HubAtivacaoCriada;
    fixture.componentInstance.linhas = [linha({
      hub_id: null,
      hub_uuid: null,
      hub_ativo: false,
      possui_credencial: false,
      ativacao_pendente: {
        id: 5,
        loja_id: 1,
        loja_nome: 'Loja',
        empresa_id: 1,
        codigo_prefixo: 'WXYZ',
        criada_em: '2026-09-28T09:00:00-03:00',
        expira_em: '2026-09-28T09:30:00-03:00',
        estado: 'PENDENTE',
        hub_id: null,
      },
    })];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('28/09/2026 09:20');
    expect(text).toContain('28/09/2026 09:30');
    expect(text).not.toContain('AM');
    expect(text).not.toContain('PM');
  });

  it('deve bloquear sincronizacao quando hub nao possui credencial', () => {
    expect(fixture.componentInstance.podeSincronizar(linha({ hub_ativo: true, possui_credencial: false }))).toBeFalse();
  });

  it('nao deve desvincular quando confirmacao for recusada', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.desvincularHub(linha());

    expect(api.desvincularHub).not.toHaveBeenCalled();
  });

  it('deve tratar erro de backend com mensagem amigavel', () => {
    api.gerarAtivacao.and.returnValue(throwError(() => ({ error: { detail: 'Loja fora do escopo do usuário.' } })));

    fixture.componentInstance.gerarAtivacao(linha());

    expect(fixture.componentInstance.errorMsg).toBe('Loja fora do escopo do usuário.');
  });

  it('deve manter polling vivo após falha isolada', fakeAsync(() => {
    fixture.componentInstance.ngOnDestroy();
    api.listarAdministracao.calls.reset();
    const linhas = [linha({ loja_id: 2, loja_nome: 'Loja 2', hub_id: 2 })];
    api.listarAdministracao.and.returnValues(
      throwError(() => new Error('offline')),
      of(linhas),
    );

    fixture.componentInstance.ngOnInit();
    tick(0);
    expect(api.listarAdministracao).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.errorMsg).toBe('Não foi possível carregar o painel administrativo do Hub.');

    tick(10000);
    expect(api.listarAdministracao).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.linhas.length).toBe(1);
    expect(fixture.componentInstance.linhas[0].loja_id).toBe(2);
    expect(fixture.componentInstance.errorMsg).toBe('');
    fixture.componentInstance.ngOnDestroy();
    discardPeriodicTasks();
  }));
});
