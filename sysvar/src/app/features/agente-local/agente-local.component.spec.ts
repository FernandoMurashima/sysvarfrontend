import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { AgenteLocalService } from '../../core/services/agente-local.service';
import { AuthService } from '../../core/auth.service';
import { AgenteLocalComponent } from './agente-local.component';
import { LojasService } from '../../core/services/lojas.service';

describe('AgenteLocalComponent', () => {
  let fixture: ComponentFixture<AgenteLocalComponent>;
  let component: AgenteLocalComponent;
  let service: jasmine.SpyObj<AgenteLocalService>;
  let lojasService: jasmine.SpyObj<LojasService>;
  let auth: jasmine.SpyObj<AuthService>;
  let clipboardWrite: jasmine.Spy;

  beforeEach(async () => {
    service = jasmine.createSpyObj<AgenteLocalService>('AgenteLocalService', [
      'gerarCodigoAtivacao',
      'listarAgentes',
      'listarConfiguracoes',
      'criarConfiguracao',
      'atualizarConfiguracao',
    ]);
    lojasService = jasmine.createSpyObj<LojasService>('LojasService', ['list']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    service.listarAgentes.and.returnValue(of([{ id: 1, empresa: 1, identificador: 'AG-1', nome: 'PC Escritório', hostname: 'DESKTOP-ABC123', ativo: true }]));
    service.listarConfiguracoes.and.returnValue(of([{ id: 10, empresa: 1, loja: null, loja_nome: null, caminho_local: 'C:\\Fiscal\\XML', ativo: true, identificador_agente: 'AG-1' }]));
    lojasService.list.and.returnValue(of({ count: 1, results: [{ id: 2, nome_loja: 'Fábrica' } as any] }));
    auth.getCurrentUser.and.returnValue({ Idempresa: 1 } as any);
    clipboardWrite = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    });
    spyOn(localStorage, 'setItem');
    spyOn(sessionStorage, 'setItem');

    await TestBed.configureTestingModule({
      imports: [AgenteLocalComponent],
      providers: [
        { provide: AgenteLocalService, useValue: service },
        { provide: LojasService, useValue: lojasService },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgenteLocalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia sem codigo visivel', () => {
    expect(component.codigoAtual).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Nenhum código gerado nesta sessão.');
    expect(fixture.nativeElement.textContent).toContain('Ativação do agente');
    expect(fixture.nativeElement.textContent).not.toContain('ABCD-EFGH-IJKL');
  });

  it('ativa loading ao gerar e desativa apos sucesso', () => {
    const response$ = new Subject<any>();
    service.gerarCodigoAtivacao.and.returnValue(response$);

    component.gerarCodigo();
    fixture.detectChanges();

    expect(component.loading).toBeTrue();
    expect(fixture.nativeElement.querySelector('.title-actions .btn').disabled).toBeTrue();

    response$.next({ codigo: 'ABCD-EFGH-IJKL', expira_em: '2026-09-03T12:15:00Z', empresa: 1 });
    response$.complete();
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.title-actions .btn').disabled).toBeFalse();
    expect(service.gerarCodigoAtivacao).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('ABCD-EFGH-IJKL');
    expect(fixture.nativeElement.textContent).toContain('Validade');
    expect(fixture.nativeElement.textContent).toContain('Este código é temporário, de uso único e expira em 15 minutos.');
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('nova geracao substitui o codigo anterior', () => {
    service.gerarCodigoAtivacao.and.returnValues(
      of({ codigo: 'AAAA-BBBB-CCCC', expira_em: '2026-09-03T12:15:00Z', empresa: 1 }),
      of({ codigo: 'DDDD-EEEE-FFFF', expira_em: '2026-09-03T12:20:00Z', empresa: 1 }),
    );

    component.gerarCodigo();
    component.gerarCodigo();
    fixture.detectChanges();

    expect(component.codigoAtual?.codigo).toBe('DDDD-EEEE-FFFF');
    expect(fixture.nativeElement.textContent).toContain('DDDD-EEEE-FFFF');
    expect(fixture.nativeElement.textContent).not.toContain('AAAA-BBBB-CCCC');
  });

  it('copia codigo usando Clipboard API', fakeAsync(() => {
    component.codigoAtual = { codigo: 'ABCD-EFGH-IJKL', expira_em: '2026-09-03T12:15:00Z', empresa: 1 };

    component.copiarCodigo();
    tick();

    expect(clipboardWrite).toHaveBeenCalledOnceWith('ABCD-EFGH-IJKL');
    expect(component.successMsg).toBe('Código copiado.');
  }));

  it('trata falha da Clipboard API sem excecao', fakeAsync(() => {
    clipboardWrite.and.returnValue(Promise.reject(new Error('blocked')));
    component.codigoAtual = { codigo: 'ABCD-EFGH-IJKL', expira_em: '2026-09-03T12:15:00Z', empresa: 1 };

    component.copiarCodigo();
    tick();

    expect(component.errorMsg).toBe('Não foi possível copiar o código automaticamente.');
  }));

  it('trata erro 403 com mensagem de permissao e libera nova tentativa', () => {
    const response$ = new Subject<any>();
    service.gerarCodigoAtivacao.and.returnValue(response$);

    component.gerarCodigo();
    fixture.detectChanges();

    expect(component.loading).toBeTrue();
    expect(fixture.nativeElement.querySelector('.title-actions .btn').disabled).toBeTrue();

    response$.error({ status: 403 });
    fixture.detectChanges();

    expect(component.codigoAtual).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.title-actions .btn').disabled).toBeFalse();
    expect(component.errorMsg).toBe('Você não possui permissão para gerar códigos de ativação.');
  });

  it('trata erro de backend com mensagem amigavel e encerra loading', () => {
    const response$ = new Subject<any>();
    service.gerarCodigoAtivacao.and.returnValue(response$);

    component.gerarCodigo();

    expect(component.loading).toBeTrue();

    response$.error({ status: 500 });

    expect(component.codigoAtual).toBeNull();
    expect(component.loading).toBeFalse();
    expect(component.errorMsg).toBe('Não foi possível gerar o código de ativação. Tente novamente.');
  });

  it('lista configuracoes de pastas monitoradas sem expor token ou codigo sensivel', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(service.listarAgentes).toHaveBeenCalled();
    expect(service.listarConfiguracoes).toHaveBeenCalled();
    expect(text).toContain('Pastas monitoradas');
    expect(text).toContain('PC Escritório - DESKTOP-ABC123');
    expect(text).toContain('Empresa inteira');
    expect(text).toContain('C:\\Fiscal\\XML');
    expect(text).not.toContain('token_hash');
    expect(text).not.toContain('token_prefixo');
  });

  it('abre inclusao com Agent em select e estabelecimento opcional', () => {
    component.abrirNovaPasta();
    fixture.detectChanges();

    const selectAgente = fixture.nativeElement.querySelector('select[formControlName="identificador_agente"]');
    const inputAgente = fixture.nativeElement.querySelector('input[formControlName="identificador_agente"]');
    expect(selectAgente).toBeTruthy();
    expect(inputAgente).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Empresa inteira');
  });

  it('exige caminho local antes de salvar', () => {
    component.abrirNovaPasta();
    component.form.patchValue({ identificador_agente: 'AG-1', caminho_local: '' });

    component.salvarPasta();

    expect(service.criarConfiguracao).not.toHaveBeenCalled();
    expect(component.errorMsg).toBe('Informe o agente e a pasta local.');
  });

  it('envia POST correto e atualiza listagem apos salvar nova configuracao', () => {
    service.criarConfiguracao.and.returnValue(of({ id: 11, empresa: 1, loja: 2, loja_nome: 'Fábrica', caminho_local: 'X:\\Fiscal\\XML', ativo: true, identificador_agente: 'AG-1' }));
    component.abrirNovaPasta();
    component.form.patchValue({ identificador_agente: 'AG-1', loja: 2, caminho_local: '  X:\\Fiscal\\XML  ', ativo: true });

    component.salvarPasta();

    expect(service.criarConfiguracao).toHaveBeenCalledOnceWith({ empresa: 1, loja: 2, caminho_local: 'X:\\Fiscal\\XML', ativo: true, identificador_agente: 'AG-1' });
    expect(service.listarConfiguracoes).toHaveBeenCalledTimes(2);
    expect(component.successMsg).toBe('Configuração salva.');
  });

  it('edicao usa PATCH sem limpar campos nao alterados', () => {
    const config = component.configuracoes[0];
    service.atualizarConfiguracao.and.returnValue(of({ ...config, caminho_local: 'D:\\NFe\\Entradas' }));

    component.editarPasta(config);
    component.form.patchValue({ caminho_local: 'D:\\NFe\\Entradas' });
    component.salvarPasta();

    expect(service.atualizarConfiguracao).toHaveBeenCalledWith(10, { empresa: 1, loja: null, caminho_local: 'D:\\NFe\\Entradas', ativo: true, identificador_agente: 'AG-1' });
    expect(component.successMsg).toBe('Configuração atualizada.');
  });

  it('ativar e desativar usa PATCH e recarrega dados', () => {
    service.atualizarConfiguracao.and.returnValue(of({ ...component.configuracoes[0], ativo: false }));

    component.alternarAtivo(component.configuracoes[0]);

    expect(service.atualizarConfiguracao).toHaveBeenCalledWith(10, { ativo: false });
    expect(component.successMsg).toBe('Configuração desativada.');
    expect(service.listarConfiguracoes).toHaveBeenCalledTimes(2);
  });

  it('exibe mensagem amigavel quando backend rejeita salvamento', () => {
    const erro$ = new Subject<any>();
    service.criarConfiguracao.and.returnValue(erro$);
    component.abrirNovaPasta();
    component.form.patchValue({ identificador_agente: 'AG-1', caminho_local: 'C:\\Fiscal\\XML' });

    component.salvarPasta();
    erro$.error({ error: { identificador_agente: ['Agente local inválido para esta empresa.'] } });

    expect(component.errorMsg).toBe('Agente local inválido para esta empresa.');
  });
});
