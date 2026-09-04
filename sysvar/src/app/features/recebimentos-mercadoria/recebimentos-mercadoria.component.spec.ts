import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { RecebimentoMercadoriaService } from '../../core/services/recebimento-mercadoria.service';
import { RecebimentosMercadoriaComponent } from './recebimentos-mercadoria.component';

describe('RecebimentosMercadoriaComponent', () => {
  let fixture: ComponentFixture<RecebimentosMercadoriaComponent>;
  let component: RecebimentosMercadoriaComponent;
  let api: jasmine.SpyObj<RecebimentoMercadoriaService>;

  const recebimento = {
    id: 4,
    criado_em: '2026-09-04T09:00:00-03:00',
    loja_nome: 'Loja A',
    fornecedor_nome: 'Fornecedor A',
    status: 'ABERTO',
    status_label: 'Aberto',
    pedidos: [],
    xml_fornecedor_dados: { numero: '123', serie: '1', valor_total: '10.00' },
  } as any;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RecebimentoMercadoriaService>('RecebimentoMercadoriaService', ['listar']);
    api.listar.and.returnValue(of({ count: 1, next: null, previous: null, results: [recebimento] }));

    await TestBed.configureTestingModule({
      imports: [RecebimentosMercadoriaComponent, RouterTestingModule],
      providers: [{ provide: RecebimentoMercadoriaService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecebimentosMercadoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lista recebimentos iniciados', () => {
    const text = fixture.nativeElement.textContent;
    expect(api.listar).toHaveBeenCalledWith({ page_size: 50 });
    expect(text).toContain('Recebimento de Mercadoria no Estoque');
    expect(text).toContain('Loja A');
    expect(text).toContain('Fornecedor A');
    expect(text).toContain('123 / 1');
    expect(text).toContain('Aberto');
  });

  it('exibe erro de API', () => {
    api.listar.and.returnValue(throwError(() => ({ status: 500 })));
    component.carregar();
    fixture.detectChanges();

    expect(component.errorMsg).toBe('Não foi possível carregar os recebimentos.');
  });
});
