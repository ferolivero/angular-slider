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
    if (!ValoresHelper.isNullOrUndefined(eventListener.eventsSubscription)) {
      eventListener.eventsSubscription.unsubscribe();
      eventListener.eventsSubscription = null;
    }

    if (!ValoresHelper.isNullOrUndefined(eventListener.events)) {
      eventListener.events.complete();
      eventListener.events = null;
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
    listener.eventName = eventName;
    listener.events = new Subject<Event>();

    const observerCallback: (event: Event) => void = (event: Event): void => {
      listener.events.next(event);
    };

    listener.teardownCallback = this.renderer.listen(nativeElement, eventName, observerCallback);

    listener.eventsSubscription = listener.events
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
