import { ComponentFixture, TestBed } from '@angular/core/testing';
import { discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HubSincronizacaoService } from '../../core/services/hub-sincronizacao.service';
import { HubSincronizacaoComponent } from './hub-sincronizacao.component';

describe('HubSincronizacaoComponent', () => {
  let fixture: ComponentFixture<HubSincronizacaoComponent>;
  let api: jasmine.SpyObj<HubSincronizacaoService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<HubSincronizacaoService>('HubSincronizacaoService', ['listarPainel', 'sincronizarLoja', 'sincronizarTodas']);
    api.listarPainel.and.returnValue(of([]));
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

  it('deve carregar painel ao iniciar', () => {
    expect(api.listarPainel).toHaveBeenCalled();
  });

  it('deve solicitar sincronizacao da loja', () => {
    fixture.componentInstance.sincronizarLoja({
      loja_id: 1,
      loja_nome: 'Loja',
      empresa_id: 1,
      hub_id: 1,
      hub_uuid: 'uuid',
      hub_ativo: true,
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
    });
    expect(api.sincronizarLoja).toHaveBeenCalledWith(1);
  });

  it('deve manter polling vivo após falha isolada', fakeAsync(() => {
    fixture.componentInstance.ngOnDestroy();
    api.listarPainel.calls.reset();
    const linhas = [{
      loja_id: 2,
      loja_nome: 'Loja 2',
      empresa_id: 1,
      hub_id: 2,
      hub_uuid: 'uuid-2',
      hub_ativo: true,
      hostname: 'HOST-2',
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
    } as const];
    api.listarPainel.and.returnValues(
      throwError(() => new Error('offline')),
      of(linhas as any),
    );

    fixture.componentInstance.ngOnInit();
    tick(0);
    expect(api.listarPainel).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.errorMsg).toBe('Não foi possível carregar o painel de sincronização.');

    tick(10000);
    expect(api.listarPainel).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.linhas.length).toBe(1);
    expect(fixture.componentInstance.linhas[0].loja_id).toBe(2);
    expect(fixture.componentInstance.errorMsg).toBe('');
    fixture.componentInstance.ngOnDestroy();
    discardPeriodicTasks();
  }));
});
