import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { AgenteLocalService } from '../../core/services/agente-local.service';
import { AgenteLocalComponent } from './agente-local.component';

describe('AgenteLocalComponent', () => {
  let fixture: ComponentFixture<AgenteLocalComponent>;
  let component: AgenteLocalComponent;
  let service: jasmine.SpyObj<AgenteLocalService>;
  let clipboardWrite: jasmine.Spy;

  beforeEach(async () => {
    service = jasmine.createSpyObj<AgenteLocalService>('AgenteLocalService', ['gerarCodigoAtivacao']);
    clipboardWrite = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    });
    spyOn(localStorage, 'setItem');
    spyOn(sessionStorage, 'setItem');

    await TestBed.configureTestingModule({
      imports: [AgenteLocalComponent],
      providers: [{ provide: AgenteLocalService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(AgenteLocalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia sem codigo visivel', () => {
    expect(component.codigoAtual).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Nenhum código gerado nesta sessão.');
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
});
