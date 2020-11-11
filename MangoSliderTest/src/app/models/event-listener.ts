import { Subject, Subscription } from 'rxjs';

export class EventListener {
  nombreEvento: string = null;
  eventos: Subject<Event> = null;
  eventosSubscription: Subscription = null;
  teardownCallback: () => void = null;
}
