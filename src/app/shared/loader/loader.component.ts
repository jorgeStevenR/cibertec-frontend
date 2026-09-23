import { Component, inject } from '@angular/core';
import { LoaderService } from './loader.service';

/**
 * URLs de las imágenes del logo (alojadas fuera del proyecto, en ImgBB).
 * Si prefieres, muévelas a environment.ts.
 */
export const LOGO_TEXTO_URL = 'https://i.ibb.co/C3bQLM71/ciberctec-texto.png';
export const LOGO_EMBLEMA_URL = 'https://i.ibb.co/HDGvj6nx/ciberctec-emblema.png';

/**
 * Loader Ciberctec (globo rodando): el emblema entra rodando
 * y va descubriendo el texto del logo; luego brilla y vuelve a empezar.
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    @if (loader.isLoading()) {
      <div class="overlay">
        <div class="logo" role="status" aria-label="Cargando">
          <img class="texto" [src]="logoTexto" alt="Ciberctec" />
          <img class="emblema" [src]="logoEmblema" alt="" />
          <div class="brillo"></div>
        </div>
        <div class="puntos" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 26px;
      background: #ffffff;
      opacity: 0;
      animation: aparecer 0.2s ease-out 0.15s forwards;
    }
    @keyframes aparecer { to { opacity: 1; } }

    .logo{position:relative;width:min(300px,78vw);aspect-ratio:2008/600;max-width:100%}
    .texto{position:absolute;inset:0;width:100%;height:100%;animation:wipe 3.2s cubic-bezier(.65,0,.35,1) infinite}
    .emblema{position:absolute;left:80.53%;top:9.33%;width:23.51%;height:auto;animation:roll 3.2s cubic-bezier(.65,0,.35,1) infinite}
    .brillo{position:absolute;inset:0;overflow:hidden;pointer-events:none;animation:fade 3.2s infinite}
    .brillo::after{content:"";position:absolute;top:0;left:-50%;width:35%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.9),transparent);animation:shine 3.2s ease-in-out infinite}
    .puntos{display:flex;gap:8px}
    .puntos span{width:8px;height:8px;border-radius:50%;background:#0d267e;animation:dot 1.2s ease-in-out infinite}
    .puntos span:nth-child(2){animation-delay:.15s}
    .puntos span:nth-child(3){animation-delay:.3s}
    @keyframes wipe{0%{clip-path:inset(0 100% 0 0);opacity:1}40%{clip-path:inset(0 0 0 0)}85%{opacity:1;clip-path:inset(0 0 0 0)}100%{opacity:0;clip-path:inset(0 0 0 0)}}
    @keyframes roll{0%{transform:translateX(-343%) rotate(-720deg);opacity:0}8%{opacity:1}40%{transform:translateX(0) rotate(0)}50%{transform:scale(1.12)}58%{transform:scale(1)}85%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.9)}}
    @keyframes shine{0%,45%{left:-50%}75%,100%{left:120%}}
    @keyframes fade{0%,85%{opacity:1}100%{opacity:0}}
    @keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.35}40%{transform:scale(1);opacity:1}}
    @media (prefers-reduced-motion:reduce){.texto,.emblema,.brillo::after{animation:none}}
  `],
})
export class LoaderComponent {
  protected loader = inject(LoaderService);

  protected logoTexto = LOGO_TEXTO_URL;
  protected logoEmblema = LOGO_EMBLEMA_URL;

  constructor() {
    // Precarga las imágenes para que ya estén listas la primera vez que salga el loader
    [LOGO_TEXTO_URL, LOGO_EMBLEMA_URL].forEach((url) => (new Image().src = url));
  }
}
