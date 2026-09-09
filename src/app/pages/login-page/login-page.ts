import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import gsap from 'gsap';
// @ts-expect-error - vanta no trae tipos oficiales
import GLOBE from 'vanta/dist/vanta.globe.min';
import * as THREE from 'three';
import { LoginForm } from '../../shared/ui/organisms/login-form/login-form';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/usuario.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginForm],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage implements AfterViewInit, OnDestroy {
  @ViewChild('vantaHost', { static: true }) vantaHost!: ElementRef<HTMLDivElement>;
  @ViewChild('headline', { static: true }) headline!: ElementRef<HTMLHeadingElement>;

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly serverError = signal('');

  private vantaEffect: unknown;
  private readonly scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01#$%&';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngAfterViewInit(): void {
    this.vantaEffect = GLOBE({
      el: this.vantaHost.nativeElement,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0x1a8fd1,
      color2: 0x4fd8e6,
      backgroundColor: 0x030814,
      size: 1.1,
    });

    this.playIntro();
  }

  ngOnDestroy(): void {
    (this.vantaEffect as { destroy?: () => void } | undefined)?.destroy?.();
  }

  onSubmit(credenciales: LoginRequest): void {
    this.serverError.set('');
    this.loading.set(true);

    this.auth.login(credenciales).subscribe({
      next: (respuesta) => {
        this.loading.set(false);

        if (respuesta.usuario.rol !== 'ADMINISTRADOR') {
          this.auth.logout();
          this.serverError.set('Esta aplicación por ahora es solo para administradores.');
          return;
        }

        this.success.set(true);
        setTimeout(() => this.router.navigateByUrl('/admin'), 500);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(error.error?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
  }

  private playIntro(): void {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.card', { opacity: 0, y: 30, scale: 0.96, duration: 0.7 })
      .from('.mark-row', { opacity: 0, y: 10, duration: 0.5 }, '-=0.35')
      .add(() => this.scrambleText(this.headline.nativeElement, 'Acceso seguro'), '-=0.2')
      .from('.sub', { opacity: 0, y: 8, duration: 0.4 }, '-=0.5')
      .from('.field', { opacity: 0, y: 12, duration: 0.45, stagger: 0.08 }, '-=0.2')
      .from('.ui-button', { opacity: 0, y: 10, duration: 0.4 }, '-=0.15');
  }

  private scrambleText(el: HTMLElement, finalText: string): void {
    const duration = 700;
    const start = performance.now();
    const resolveAt = finalText
      .split('')
      .map((_, i) => (i / finalText.length) * duration + Math.random() * 120);

    const frame = (now: number) => {
      const elapsed = now - start;
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') {
          out += ' ';
        } else if (elapsed >= resolveAt[i]) {
          out += finalText[i];
        } else {
          out += this.scrambleChars[Math.floor(Math.random() * this.scrambleChars.length)];
        }
      }
      el.textContent = out;
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
      }
    };
    requestAnimationFrame(frame);
  }
}
