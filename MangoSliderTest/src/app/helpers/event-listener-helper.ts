import { Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { tap, throttleTime } from 'rxjs/operators';
import { EventListener } from '../models';
import { ValoresHelper } from './valores-helper';

/**
 * Helper class to attach event listeners to DOM elements with debounce support using rxjs
 */
export class EventListenerHelper {
  constructor(private renderer: Renderer2) {}

  public detachEventListener(eventListener: EventListener): void {
    if (!ValoresHelper.isNullOrUndefined(eventListener.eventosSubscription)) {
      eventListener.eventosSubscription.unsubscribe();
      eventListener.eventosSubscription = null;
    }

    if (!ValoresHelper.isNullOrUndefined(eventListener.eventos)) {
      eventListener.eventos.complete();
      eventListener.eventos = null;
    }

    if (!ValoresHelper.isNullOrUndefined(eventListener.teardownCallback)) {
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
        !ValoresHelper.isNullOrUndefined(throttleInterval)
          ? throttleTime(throttleInterval, undefined, { leading: true, trailing: true })
          : tap(() => {}) // no-op
      )
      .subscribe((event: Event) => {
        callback(event);
      });

    return listener;
  }
}
