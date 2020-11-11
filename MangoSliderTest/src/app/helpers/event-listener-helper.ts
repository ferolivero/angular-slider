import { Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { tap, throttleTime } from 'rxjs/operators';
import { EventListener } from '../models/event-listener';
import { UtilsHelper } from './utils-helper';

export class EventosHelper {
  constructor(private renderer: Renderer2) {}

  public detachEventListener(eventListener: EventListener): void {
    if (!UtilsHelper.esIndefinidoONulo(eventListener.eventosSubscription)) {
      eventListener.eventosSubscription.unsubscribe();
      eventListener.eventosSubscription = null;
    }

    if (!UtilsHelper.esIndefinidoONulo(eventListener.eventos)) {
      eventListener.eventos.complete();
      eventListener.eventos = null;
    }

    if (!UtilsHelper.esIndefinidoONulo(eventListener.teardownCallback)) {
      eventListener.teardownCallback();
      eventListener.teardownCallback = null;
    }
  }

  public attachEventListener(
    nativeElement: any,
    eventName: string,
    callback: (event: any) => void,
    throttleInterval?: number
  ): EventListener {
    const listener: EventListener = new EventListener();
    listener.nombreEvento = eventName;
    listener.eventos = new Subject<Event>();

    const observerCallback: (event: Event) => void = (event: Event): void => {
      listener.eventos.next(event);
    };

    listener.teardownCallback = this.renderer.listen(nativeElement, eventName, observerCallback);

    listener.eventosSubscription = listener.eventos
      .pipe(
        !UtilsHelper.esIndefinidoONulo(throttleInterval)
          ? throttleTime(throttleInterval, undefined, { leading: true, trailing: true })
          : tap(() => {}) // no-op
      )
      .subscribe((event: Event) => {
        callback(event);
      });

    return listener;
  }
}
