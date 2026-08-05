import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuditoriaComponent } from './auditoria.component';
import { AuditService } from '../../core/services/audit.service';
import { AuthService } from '../../core/auth.service';

describe('AuditoriaComponent', () => {
  let fixture: ComponentFixture<AuditoriaComponent>;
  let component: AuditoriaComponent;
  const auditApi = {
    list: jasmine.createSpy('list').and.returnValue(of({ count: 0, next: null, previous: null, results: [] })),
    get: jasmine.createSpy('get').and.returnValue(of({ id: 1 })),
    getIndicators: jasmine.createSpy('getIndicators').and.returnValue(of({ total: 0, success: 0, failure: 0, denied: 0, critical: 0 })),
    exportCsv: jasmine.createSpy('exportCsv').and.returnValue(of(new Blob())),
  };
  const auth = {
    getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ is_superuser: false, is_company_master: false }),
    podeAcessarModulo: jasmine.createSpy('podeAcessarModulo').and.callFake((_m: string, edit?: boolean) => edit ? false : true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent],
      providers: [
        { provide: AuditService, useValue: auditApi },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    auditApi.list.and.returnValue(of({ count: 0, next: null, previous: null, results: [] }));
    auditApi.getIndicators.and.returnValue(of({ total: 0, success: 0, failure: 0, denied: 0, critical: 0 }));
    auditApi.exportCsv.and.returnValue(of(new Blob()));
    auth.getCurrentUser.and.returnValue({ is_superuser: false, is_company_master: false });
    auth.podeAcessarModulo.and.callFake((_m: string, edit?: boolean) => edit ? false : true);
    fixture = TestBed.createComponent(AuditoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega indicadores e tabela', () => {
    expect(auditApi.list).toHaveBeenCalled();
    expect(auditApi.getIndicators).toHaveBeenCalled();
  });

  it('envia filtros ao consultar', () => {
    component.filters.action = 'USER_LOGIN';
    component.consultar();
    expect(auditApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'USER_LOGIN', page: 1 }));
  });

  it('oculta empresa para usuario nao superusuario', () => {
    component.filters.empresa = 99;
    component.load();
    const args = auditApi.list.calls.mostRecent().args[0];
    expect(args.empresa).toBeUndefined();
  });

  it('oculta exportacao para VIEW', () => {
    expect(component.canExport).toBeFalse();
  });

  it('exibe exportacao para EDIT e master', () => {
    auth.podeAcessarModulo.and.callFake((_m: string, edit?: boolean) => edit ? true : true);
    expect(component.canExport).toBeTrue();
    auth.podeAcessarModulo.and.returnValue(false);
    auth.getCurrentUser.and.returnValue({ is_superuser: false, is_company_master: true });
    expect(component.canExport).toBeTrue();
  });

  it('trata erro 403', () => {
    auditApi.list.and.returnValue(throwError(() => ({ status: 403 })));
    component.load();
    expect(component.errorMsg).toContain('Sem permissão');
  });

  it('trata erro 403 de filtros de empresa ou loja', () => {
    auditApi.list.and.returnValue(throwError(() => ({ status: 403, error: { detail: 'Sem permissão para consultar auditoria desta loja.' } })));
    component.filters.loja = 2;
    component.load();
    expect(component.errorMsg).toContain('Sem permissão');
  });

  it('nao possui comandos de editar ou excluir', () => {
    const text = fixture.nativeElement.textContent.toLowerCase();
    expect(text).not.toContain('editar');
    expect(text).not.toContain('excluir');
  });

  it('exibe antes e depois no detalhe', () => {
    const rows = component.diffRows({
      id: 1,
      event_id: 'e',
      created_at: '',
      user_username: null,
      empresa_nome: null,
      loja_nome: null,
      category: 'SECURITY',
      action: 'USER_LOGIN',
      result: 'SUCCESS',
      severity: 'INFO',
      entidade: 'accounts.user',
      object_id: '1',
      object_repr: null,
      ip: null,
      request_id: null,
      correlation_id: null,
      empresa: null,
      empresa_id_snapshot: null,
      empresa_nome_snapshot: null,
      loja: null,
      loja_id_snapshot: null,
      loja_nome_snapshot: null,
      user: null,
      user_id_snapshot: null,
      username_snapshot: null,
      user_nome_snapshot: null,
      session_id: null,
      device_id: null,
      origin: 'API',
      app_label: 'accounts',
      model: 'user',
      before_data: { ativo: false },
      after_data: { ativo: true },
      changed_fields: ['ativo'],
      metadata: null,
      user_agent: null,
      http_method: null,
      endpoint: null,
      status_code: null,
      error_code: null,
      error_message: null,
    });
    expect(rows[0]).toEqual({ campo: 'ativo', antes: 'false', depois: 'true' });
  });
});
