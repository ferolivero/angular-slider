import { ChangeDetectorRef, Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { EventosHelper, UtilsHelper } from '../helpers';
import { EventListener } from '../models';

@Directive({ selector: '[ngcRangeElement]' })
export class NgcRangeElementoDirective {
  constructor(
    protected elemRef: ElementRef,
    protected renderer: Renderer2,
    protected changeDetectionRef: ChangeDetectorRef
  ) {
    this.eventListenerHelper = new EventosHelper(this.renderer);
  }

  private eventListenerHelper: EventosHelper;
  private eventListeners: EventListener[] = [];

  private _posicion: number = 0;
  private _dimension: number = 0;

  get position(): number {
    return this._posicion;
  }

  get dimension(): number {
    return this._dimension;
  }

  @HostBinding('style.left')
  left: string = '';

  @HostBinding('style.width')
  width: string = '';

  /** Actualiza la posicion del elemento */
  actualizarPosicion(posicion: number): void {
    if (this._posicion !== posicion && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._posicion = posicion;
    this.left = Math.round(posicion) + 'px';
  }

  /** Calcular la dimension a partir del elemento en pantalla */
  calcularDimension(): void {
    const val: ClientRect = this.obtenerPosicionEnPantalla();
    this._dimension = val.right - val.left;
  }

  /** Aplicar nueva dimension */
  aplicarDimension(dim: number): void {
    if (this._dimension !== dim && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._dimension = dim;
    this.width = Math.round(dim) + 'px';
  }

  /** Obtener el elemento de la pantalla y su dimension */
  obtenerPosicionEnPantalla(): ClientRect {
    return this.elemRef.nativeElement.getBoundingClientRect();
  }

  /** Activa el evento al elemento y lo agrega a la lista de eventos activos  */
  activarEvento(evento: string, callback: (event: any) => void): void {
    const listener: EventListener = this.eventListenerHelper.activarEvento(
      this.elemRef.nativeElement,
      evento,
      callback
    );
    this.eventListeners.push(listener);
  }

  /** Desactiva todos los eventos del elemento */
  desactivarEventosElemento(): void {
    for (const listener of this.eventListeners) {
      this.eventListenerHelper.desactivarEventListener(listener);
    }
  }

  private isRefDestroyed(): boolean {
    return UtilsHelper.esIndefinidoONulo(this.changeDetectionRef) || this.changeDetectionRef['destroyed'];
  }
}
