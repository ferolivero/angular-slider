import { ChangeDetectorRef, Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { EventosHelper, UtilsHelper } from '../helpers';
import { EventListener } from '../models';

@Directive({ selector: '[customRangeElement]' })
export class CustomRangeElementDirective {
  constructor(
    protected elemRef: ElementRef,
    protected renderer: Renderer2,
    protected changeDetectionRef: ChangeDetectorRef
  ) {
    this.eventListenerHelper = new EventosHelper(this.renderer);
  }

  private _position: number = 0;
  get position(): number {
    return this._position;
  }

  private _dimension: number = 0;
  get dimension(): number {
    return this._dimension;
  }

  @HostBinding('style.left')
  left: string = '';

  @HostBinding('style.bottom')
  bottom: string = '';

  @HostBinding('style.height')
  height: string = '';

  @HostBinding('style.width')
  width: string = '';

  private eventListenerHelper: EventosHelper;
  private eventListeners: EventListener[] = [];

  // Set element left/top position depending on whether slider is horizontal or vertical
  setPosition(pos: number): void {
    if (this._position !== pos && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._position = pos;
    this.left = Math.round(pos) + 'px';
  }

  // Calculate element's width/height depending on whether slider is horizontal or vertical
  calcularDimension(): void {
    const val: ClientRect = this.getBoundingClientRect();
    this._dimension = val.right - val.left;
  }

  // Set element width/height depending on whether slider is horizontal or vertical
  aplicarDimension(dim: number): void {
    if (this._dimension !== dim && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._dimension = dim;
    this.width = Math.round(dim) + 'px';
  }

  getBoundingClientRect(): ClientRect {
    return this.elemRef.nativeElement.getBoundingClientRect();
  }

  activarEvento(eventName: string, callback: (event: any) => void, debounceInterval?: number): void {
    const listener: EventListener = this.eventListenerHelper.attachEventListener(
      this.elemRef.nativeElement,
      eventName,
      callback,
      debounceInterval
    );
    this.eventListeners.push(listener);
  }

  desactivarEvento(eventName?: string): void {
    let listenersToKeep: EventListener[];
    let listenersToRemove: EventListener[];
    if (!UtilsHelper.esIndefinidoONulo(eventName)) {
      listenersToKeep = this.eventListeners.filter(
        (event: EventListener) => event.nombreEvento !== eventName
      );
      listenersToRemove = this.eventListeners.filter(
        (event: EventListener) => event.nombreEvento === eventName
      );
    } else {
      listenersToKeep = [];
      listenersToRemove = this.eventListeners;
    }

    for (const listener of listenersToRemove) {
      this.eventListenerHelper.detachEventListener(listener);
    }

    this.eventListeners = listenersToKeep;
  }

  private isRefDestroyed(): boolean {
    return UtilsHelper.esIndefinidoONulo(this.changeDetectionRef) || this.changeDetectionRef['destroyed'];
  }
}
