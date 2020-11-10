import { ChangeDetectorRef, Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { EventListener } from '../helpers/event-listener';
import { EventListenerHelper } from '../helpers/event-listener-helper';
import { ValoresHelper } from '../helpers/valores-helper';

@Directive({ selector: '[customRangeElement]' })
export class CustomRangeElementDirective {
  constructor(
    protected elemRef: ElementRef,
    protected renderer: Renderer2,
    protected changeDetectionRef: ChangeDetectorRef
  ) {
    this.eventListenerHelper = new EventListenerHelper(this.renderer);
  }

  private _position: number = 0;
  get position(): number {
    return this._position;
  }

  private _dimension: number = 0;
  get dimension(): number {
    return this._dimension;
  }

  private _scale: number = 1;
  get scale(): number {
    return this._scale;
  }

  @HostBinding('style.opacity')
  opacity: number = 1;

  @HostBinding('style.visibility')
  visibility: string = 'visible';

  @HostBinding('style.left')
  left: string = '';

  @HostBinding('style.bottom')
  bottom: string = '';

  @HostBinding('style.height')
  height: string = '';

  @HostBinding('style.width')
  width: string = '';

  private eventListenerHelper: EventListenerHelper;
  private eventListeners: EventListener[] = [];

  setScale(scale: number): void {
    this._scale = scale;
  }

  // Set element left/top position depending on whether slider is horizontal or vertical
  setPosition(pos: number): void {
    if (this._position !== pos && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._position = pos;
    // if (this._vertical) {
    // this.bottom = Math.round(pos) + 'px';
    // } else {
    this.left = Math.round(pos) + 'px';
    // }
  }

  // Calculate element's width/height depending on whether slider is horizontal or vertical
  calculateDimension(): void {
    const val: ClientRect = this.getBoundingClientRect();
    this._dimension = (val.right - val.left) * this.scale;
  }

  // Set element width/height depending on whether slider is horizontal or vertical
  setDimension(dim: number): void {
    if (this._dimension !== dim && !this.isRefDestroyed()) {
      this.changeDetectionRef.markForCheck();
    }

    this._dimension = dim;
    this.width = Math.round(dim) + 'px';
  }

  getBoundingClientRect(): ClientRect {
    return this.elemRef.nativeElement.getBoundingClientRect();
  }

  on(eventName: string, callback: (event: any) => void, debounceInterval?: number): void {
    const listener: EventListener = this.eventListenerHelper.attachEventListener(
      this.elemRef.nativeElement,
      eventName,
      callback,
      debounceInterval
    );
    this.eventListeners.push(listener);
  }

  off(eventName?: string): void {
    let listenersToKeep: EventListener[];
    let listenersToRemove: EventListener[];
    if (!ValoresHelper.isNullOrUndefined(eventName)) {
      listenersToKeep = this.eventListeners.filter((event: EventListener) => event.eventName !== eventName);
      listenersToRemove = this.eventListeners.filter((event: EventListener) => event.eventName === eventName);
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
    return ValoresHelper.isNullOrUndefined(this.changeDetectionRef) || this.changeDetectionRef['destroyed'];
  }
}
