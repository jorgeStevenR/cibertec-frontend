import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { EstadoVencimiento } from '../../../../core/models/estudiante-avance.model';
import { EventoCalendario } from '../../../../core/models/evento-calendario.model';
import {
  agruparPorDia,
  claveDia,
  estadoDelDia,
  eventosDelMes,
  parsearFecha,
  rangoDelMes,
  semanasDelMes,
} from '../../../../core/utils/calendario.util';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_LISTA = 6;

const ESTADO_TEXTO: Record<EstadoVencimiento, string> = {
  PENDIENTE: '',
  ENTREGADA: 'Entregada',
  RENDIDO: 'Rendido',
  VENCIDA: 'Vencida',
};

@Component({
  selector: 'mini-calendario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-calendario.html',
  styleUrl: './mini-calendario.scss',
})
export class MiniCalendario {
  // Se espera que los eventos correspondan al mes visible; al cambiar de mes se emite
  // `mesCambiado` con el rango a pedir y quien usa el componente actualiza `eventos`.
  readonly eventos = input<EventoCalendario[]>([]);
  readonly error = input(false);
  readonly mesCambiado = output<{ desde: string; hasta: string }>();

  readonly diasSemana = DIAS_SEMANA;
  readonly hoy = new Date();
  readonly claveHoy = claveDia(this.hoy);

  private readonly anio = signal(this.hoy.getFullYear());
  private readonly mes = signal(this.hoy.getMonth());

  readonly etiquetaMes = computed(() => {
    const texto = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
      new Date(this.anio(), this.mes(), 1),
    );
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });

  readonly semanas = computed(() => semanasDelMes(this.anio(), this.mes()));
  readonly eventosPorDia = computed(() => agruparPorDia(this.eventos()));
  private readonly delMes = computed(() => eventosDelMes(this.eventos(), this.anio(), this.mes()));
  readonly visibles = computed(() => this.delMes().slice(0, MAX_LISTA));
  readonly ocultos = computed(() => Math.max(0, this.delMes().length - MAX_LISTA));

  mesAnterior(): void {
    this.moverMes(-1);
  }

  mesSiguiente(): void {
    this.moverMes(1);
  }

  claseDia(clave: string): string {
    const estado = estadoDelDia(this.eventosPorDia().get(clave) ?? []);
    return estado ? `con-evento estado-${estado}` : '';
  }

  titulosDelDia(clave: string): string {
    return (this.eventosPorDia().get(clave) ?? [])
      .map((e) => {
        const estado = ESTADO_TEXTO[e.estado];
        return `${e.titulo} (${e.curso})${estado ? ` - ${estado}` : ''}`;
      })
      .join(', ');
  }

  textoEstado(estado: EstadoVencimiento): string {
    return ESTADO_TEXTO[estado];
  }

  formatearDia(fecha: string): string {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(parsearFecha(fecha));
  }

  private moverMes(delta: number): void {
    const destino = new Date(this.anio(), this.mes() + delta, 1);
    this.anio.set(destino.getFullYear());
    this.mes.set(destino.getMonth());
    this.mesCambiado.emit(rangoDelMes(destino.getFullYear(), destino.getMonth()));
  }
}
