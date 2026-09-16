import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { LoginForm, mensajeErrorControl } from './login-form';

describe('mensajeErrorControl', () => {
  const mensajes = { requerido: 'Es obligatorio', invalido: 'Formato inválido' };

  it('devuelve el mensaje de requerido cuando el control está vacío', () => {
    const control = new FormControl('', [Validators.required, Validators.email]);
    control.updateValueAndValidity();

    expect(mensajeErrorControl(control, mensajes)).toBe(mensajes.requerido);
  });

  it('devuelve el mensaje de inválido cuando el error no es "required"', () => {
    const control = new FormControl('no-es-un-correo', [Validators.required, Validators.email]);
    control.updateValueAndValidity();

    expect(mensajeErrorControl(control, mensajes)).toBe(mensajes.invalido);
  });
});

describe('LoginForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginForm],
    }).compileComponents();
  });

  it('no emite submitted si ya está cargando, aunque el formulario sea válido', () => {
    const fixture = TestBed.createComponent(LoginForm);
    fixture.componentRef.setInput('loading', true);

    const component = fixture.componentInstance;
    component.form.setValue({ email: 'test@ciberctec.edu.co', password: '123456' });

    const emitidos: unknown[] = [];
    component.submitted.subscribe((valor) => emitidos.push(valor));

    component.onSubmit();

    expect(emitidos.length).toBe(0);
  });

  it('emite submitted con las credenciales cuando el formulario es válido y no está cargando', () => {
    const fixture = TestBed.createComponent(LoginForm);
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'test@ciberctec.edu.co', password: '123456' });

    const emitidos: unknown[] = [];
    component.submitted.subscribe((valor) => emitidos.push(valor));

    component.onSubmit();

    expect(emitidos).toEqual([{ email: 'test@ciberctec.edu.co', password: '123456' }]);
  });
});
