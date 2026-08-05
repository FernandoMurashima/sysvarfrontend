import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ChangePasswordRequiredComponent } from './change-password-required.component';

describe('ChangePasswordRequiredComponent', () => {
  let component: ChangePasswordRequiredComponent;
  let fixture: ComponentFixture<ChangePasswordRequiredComponent>;
  const auth = {
    changeRequiredPassword: jasmine.createSpy('changeRequiredPassword'),
    refreshMe: jasmine.createSpy('refreshMe'),
    logout: jasmine.createSpy('logout').and.returnValue(of({})),
  };
  const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };

  beforeEach(async () => {
    auth.changeRequiredPassword.calls.reset();
    auth.refreshMe.calls.reset();
    router.navigateByUrl.calls.reset();
    await TestBed.configureTestingModule({
      imports: [ChangePasswordRequiredComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordRequiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('valida confirmacao antes de chamar backend', () => {
    component.form.setValue({ senha_atual: 'senha12345', nova_senha: 'NovaSenha123', confirmacao: 'OutraSenha123' });
    component.alterar();
    expect(auth.changeRequiredPassword).not.toHaveBeenCalled();
    expect(component.errorMsg).toContain('confirmação');
  });

  it('atualiza me e libera sistema no sucesso', () => {
    auth.changeRequiredPassword.and.returnValue(of({ deve_trocar_senha: false }));
    auth.refreshMe.and.returnValue(of({ deve_trocar_senha: false }));
    component.form.setValue({ senha_atual: 'senha12345', nova_senha: 'NovaSenha123', confirmacao: 'NovaSenha123' });
    component.alterar();
    expect(auth.changeRequiredPassword).toHaveBeenCalled();
    expect(auth.refreshMe).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('exibe erro do backend sem limpar token', () => {
    auth.changeRequiredPassword.and.returnValue(throwError(() => ({ error: { detail: 'Senha atual inválida.' } })));
    component.form.setValue({ senha_atual: 'errada123', nova_senha: 'NovaSenha123', confirmacao: 'NovaSenha123' });
    component.alterar();
    expect(component.errorMsg).toContain('Senha atual');
  });
});
