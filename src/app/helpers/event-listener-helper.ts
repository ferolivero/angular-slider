import { Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { tap, throttleTime } from 'rxjs/operators';
import { EventListener } from '../models/event-listener';
import { UtilsHelper } from './utils-helper';

/** Helper para el manejo de la activacion y desactivacion de los eventos. */
export class EventosHelper {
  constructor(private renderer: Renderer2) {}

  /** Desactiva los eventos anulando la subscripcion, completando los eventos y cancelando la escucha del renderer */
  public desactivarEventListener(eventListener: EventListener): void {
    if (!UtilsHelper.esIndefinidoONulo(eventListener.eventosSubscription)) {
      eventListener.eventosSubscription.unsubscribe();
      eventListener.eventosSubscription = null;
    }

    if (!UtilsHelper.esIndefinidoONulo(eventListener.eventos)) {
      eventListener.eventos.complete();
      eventListener.eventos = null;
    }

    if (!UtilsHelper.esIndefinidoONulo(eventListener.cancelarRenderListen)) {
      eventListener.cancelarRenderListen();
      eventListener.cancelarRenderListen = null;
    }
  }

  /** Activa el evento el evento y se agrega dentro de la lista de eventos activos del elemento. */
  public activarEvento(
    elemento: any,
    evento: string,
    callback: (event: any) => void,
    intervalo?: number
  ): EventListener {
    const listener: EventListener = new EventListener();
    listener.nombreEvento = evento;
    listener.eventos = new Subject<Event>();

    const observerCallback = (event: Event): void => listener.eventos.next(event);
    listener.cancelarRenderListen = this.renderer.listen(elemento, evento, observerCallback);

    listener.eventosSubscription = listener.eventos
      .pipe(
        !UtilsHelper.esIndefinidoONulo(intervalo) ? throttleTime(intervalo) : tap(() => {}) // no-op
      )
      .subscribe((event: Event) => {
        callback(event);
      });

    return listener;
  }
}
