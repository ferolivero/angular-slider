import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, throttleTime } from 'rxjs/operators';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { EventosHelper, UtilsHelper } from '../helpers';
import {
  Deslizable,
  EventListener,
  InputModelChange,
  ModelChange,
  OutputModelChange,
  TipoPunto,
  TipoSlider
} from '../models';
import { CustomRangeHandleDirective } from './../directives/custom-range-handle.directive';
import { CustomRangeLabelDirective } from './../directives/custom-range-label.directive';

const NGX_SLIDER_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  /* tslint:disable-next-line: no-use-before-declare */
  useExisting: forwardRef(() => NgcRangeComponent),
  multi: true
};

@Component({
  selector: 'ngc-range',
  templateUrl: './ngc-range.component.html',
  styleUrls: ['./ngc-range.component.scss'],
  host: { class: 'ngc-range' },
  encapsulation: ViewEncapsulation.None,
  providers: [NGX_SLIDER_CONTROL_VALUE_ACCESSOR]
})
export class NgcRangeComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input('ngModel') slideValores: number[];
  @Input() type: string = TipoSlider.Normal;
  @Input() min: number;
  @Input() max: number;
  @Input() values: number[] = null;

  @Output()
  valueChange: EventEmitter<number> = new EventEmitter();
  @Output()
  valorSuperiorChange: EventEmitter<number> = new EventEmitter();
  @Output()
  rangeChange: EventEmitter<number[]> = new EventEmitter();

  @ViewChild('valorElement', { read: CustomRangeElementDirective })
  inputValorElement: CustomRangeElementDirective;
  @ViewChild('valorSuperiorElement', { read: CustomRangeElementDirective })
  inputValorSuperiorElement: CustomRangeElementDirective;
  @ViewChild('fullBar', { read: CustomRangeElementDirective })
  fullBarElement: CustomRangeElementDirective;
  @ViewChild('selectionBar', { read: CustomRangeElementDirective })
  selectionBarElement: CustomRangeElementDirective;
  @ViewChild('minHandle', { read: CustomRangeHandleDirective })
  minHandleElement: CustomRangeHandleDirective;
  @ViewChild('maxHandle', { read: CustomRangeHandleDirective })
  maxHandleElement: CustomRangeHandleDirective;
  @ViewChild('minHandleLabel', { read: CustomRangeLabelDirective })
  minHandleLabelElement: CustomRangeLabelDirective;
  @ViewChild('maxHandleLabel', { read: CustomRangeLabelDirective })
  maxHandleLabelElement: CustomRangeLabelDirective;

  valor: number = null;
  valorSuperior: number = null;

  /** Atributos para mostrar span o input en el label */
  valorEditable = false;
  valorSuperiorEditable = false;

  /** Input / Output subscripcion y subject */
  private inputModelChangeSubject: Subject<InputModelChange> = new Subject<InputModelChange>();
  private outputModelChangeSubject: Subject<OutputModelChange> = new Subject<OutputModelChange>();
  private inputModelChangeSubscription: Subscription = null;
  private outputModelChangeSubscription: Subscription = null;

  /** Listeners y helpers */
  private eventListenerHelper: EventosHelper = null;
  private onMoveEventListener: EventListener = null;
  private onEndEventListener: EventListener = null;

  private componenteInicializado: boolean = false;
  private cantidadDecimales: number = 8;
  private handleHalfDimension: number = 0;
  private maximaPosicionDeslizable: number = 0;
  private limiteInferior: number = 0;
  private limiteSuperior: number = null;
  private vistaValorInferior: number = null;
  private vistaValorSuperior: number = null;
  private deslizable = new Deslizable();
  private tipoPuntoActivo: TipoPunto = null;

  // Callbacks for reactive forms support
  private onTouchedCallback: (value: any) => void = null;
  private onChangeCallback: (value: any) => void = null;

  public constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private changeDetectionRef: ChangeDetectorRef
  ) {
    this.eventListenerHelper = new EventosHelper(this.renderer);
  }

  public ngOnInit(): void {
    if (this.type === TipoSlider.Fixed) {
      this.valor = this.values[0];
      this.valorSuperior = this.values[this.values.length - 1];
    } else {
      this.limiteInferior = this.min;
      this.limiteSuperior = this.max;
      this.valor = this.min;
      this.valorSuperior = this.max;
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (
      !UtilsHelper.esIndefinidoONulo(changes.valor) ||
      !UtilsHelper.esIndefinidoONulo(changes.valorSuperior)
    ) {
      this.inputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: false,
        internalChange: false
      });
    }
  }

  public ngAfterViewInit(): void {
    if (this.type === TipoSlider.Fixed) this.aplicarConfiguracionFixed();
    this.subscribeInputCambios();
    this.subscribeOutputModelChangeSubject();

    this.vistaValorInferior = this.obtenerLabelSegunTipoSlider(this.valor);
    this.vistaValorSuperior = this.obtenerLabelSegunTipoSlider(this.valorSuperior);

    this.calcularDimensiones();
    this.actualizarDeslizables();
    this.bindearEventos();
    this.componenteInicializado = true;
    this.changeDetectionRef.detectChanges();
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any): void {
    this.procesarReajustePantalla();
  }

  /** Subscribirse a los cambios en los inputs */
  private subscribeInputCambios(): void {
    this.inputModelChangeSubscription = this.inputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        filter((modelChange: InputModelChange) => modelChange.forceChange),
        throttleTime(100, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: InputModelChange) => this.actualizarModeloDesdeInput(modelChange));
  }

  private subscribeOutputModelChangeSubject(): void {
    this.outputModelChangeSubscription = this.outputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        throttleTime(100, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: OutputModelChange) => this.publicarCambios(modelChange));
  }

  private unsubscribeOnMove(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.onMoveEventListener)) {
      this.eventListenerHelper.desactivarEventListener(this.onMoveEventListener);
      this.onMoveEventListener = null;
    }
  }

  private unsubscribeOnEnd(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.onEndEventListener)) {
      this.eventListenerHelper.desactivarEventListener(this.onEndEventListener);
      this.onEndEventListener = null;
    }
  }

  private unsubscribeInputModelChangeSubject(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.inputModelChangeSubscription)) {
      this.inputModelChangeSubscription.unsubscribe();
      this.inputModelChangeSubscription = null;
    }
  }

  private unsubscribeOutputModelChangeSubject(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.outputModelChangeSubscription)) {
      this.outputModelChangeSubscription.unsubscribe();
      this.outputModelChangeSubscription = null;
    }
  }

  /** Obtener el elemento deslizable segun tipo de punto */
  private obtenerDeslizableElement(tipoPunto: TipoPunto): CustomRangeHandleDirective {
    if (tipoPunto === TipoPunto.Min) {
      return this.minHandleElement;
    } else if (tipoPunto === TipoPunto.Max) {
      return this.maxHandleElement;
    }
    return null;
  }

  /** Obtiene el valor actual de la vista dependiendo del tipo de deslizable activo */
  private obtenerValorVistaActual(): number {
    if (this.tipoPuntoActivo === TipoPunto.Min) {
      return this.vistaValorInferior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max) {
      return this.vistaValorSuperior;
    }
    return null;
  }

  /** Obtener el valor de la vista */
  private obtenerLabelSegunTipoSlider(value: number): number {
    if (UtilsHelper.esIndefinidoONulo(value)) {
      return NaN;
    } else if (this.type === TipoSlider.Fixed) {
      return UtilsHelper.obtenerIndiceNodo(+value, this.values);
    }
    return +value;
  }

  /** Obtiene el valor del modelo segun el tipo de slider */
  private obtenerValorModeloSegunTipo(valor: number): number {
    if (this.type === TipoSlider.Fixed) {
      return this.obtenerValorNodo(valor);
    }
    return valor;
  }

  /** Obtener valor del nodo correspondiente al indice */
  private obtenerValorNodo(indice: number): number {
    const nodo: number = this.values[indice];
    return !UtilsHelper.esIndefinidoONulo(nodo) ? nodo : NaN;
  }

  /** Actualizar los cambios al modelo */
  private actualizarModelo(): void {
    this.valor = this.obtenerValorModeloSegunTipo(this.vistaValorInferior);
    this.valorSuperior = this.obtenerValorModeloSegunTipo(this.vistaValorSuperior);

    this.outputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      userEventInitiated: true,
      forceChange: false
    });

    this.inputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      forceChange: false,
      internalChange: true
    });
  }

  /** Actualizar cambios al modelo a partir del input */
  private actualizarModeloDesdeInput(modelChange: InputModelChange): void {
    const valoresNormalizados: InputModelChange = this.normalizarValores(modelChange);

    if (this.type === TipoSlider.Normal) {
      if (valoresNormalizados.valor > this.vistaValorSuperior) {
        valoresNormalizados.valor = this.vistaValorSuperior;
      } else if (valoresNormalizados.valor < this.min) {
        valoresNormalizados.valor = this.min;
      }

      if (valoresNormalizados.valorSuperior < this.vistaValorInferior) {
        valoresNormalizados.valorSuperior = this.vistaValorInferior;
      } else if (valoresNormalizados.valorSuperior > this.max) {
        valoresNormalizados.valorSuperior = this.max;
      }
    }

    // If normalised model change is different, apply the change to the model values
    const normalisationChange: boolean = !ModelChange.compare(modelChange, valoresNormalizados);
    if (normalisationChange) {
      this.valor = valoresNormalizados.valor;
      this.valorSuperior = valoresNormalizados.valorSuperior;
    }

    this.vistaValorInferior = this.obtenerLabelSegunTipoSlider(valoresNormalizados.valor);
    this.vistaValorSuperior = this.obtenerLabelSegunTipoSlider(valoresNormalizados.valorSuperior);

    this.actualizarDeslizables();

    // At the end, we need to communicate the model change to the outputs as well
    // Normalisation changes are also always forced out to ensure that subscribers always end up in correct state
    this.outputModelChangeSubject.next({
      valor: valoresNormalizados.valor,
      valorSuperior: valoresNormalizados.valorSuperior,
      forceChange: normalisationChange,
      userEventInitiated: false
    });
  }

  /** Publica los cambios en el modelo con los callbacks NgModel y outputs */
  private publicarCambios(modelChange: OutputModelChange): void {
    const emitOutputs: () => void = (): void => {
      this.valueChange.emit(modelChange.valor);
      this.valorSuperiorChange.emit(modelChange.valorSuperior);
    };

    if (!UtilsHelper.esIndefinidoONulo(this.onChangeCallback)) {
      this.onChangeCallback([modelChange.valor, modelChange.valorSuperior]);
    }
    if (!UtilsHelper.esIndefinidoONulo(this.onTouchedCallback)) {
      this.onTouchedCallback([modelChange.valor, modelChange.valorSuperior]);
    }

    if (modelChange.userEventInitiated) {
      emitOutputs();
    } else {
      setTimeout(() => {
        emitOutputs();
      });
    }
  }

  /** Normalizar valores de los nuevos cambios */
  private normalizarValores(valores: InputModelChange): InputModelChange {
    const inputNormalizado: InputModelChange = new InputModelChange();
    inputNormalizado.valor = valores.valor;
    inputNormalizado.valorSuperior = valores.valorSuperior;

    if (this.type === TipoSlider.Fixed) {
      const index: number = UtilsHelper.obtenerIndiceNodo(inputNormalizado.valor, this.values);
      inputNormalizado.valor = this.values[index];

      const valorSuperiorIndex: number = UtilsHelper.obtenerIndiceNodo(
        inputNormalizado.valorSuperior,
        this.values
      );
      inputNormalizado.valorSuperior = this.values[valorSuperiorIndex];

      return inputNormalizado;
    }

    inputNormalizado.valor = this.redondearNodo(inputNormalizado.valor);
    inputNormalizado.valorSuperior = this.redondearNodo(inputNormalizado.valorSuperior);
    return inputNormalizado;
  }

  /** Aplicar la configuracion referida al slider con valores fijos */
  private aplicarConfiguracionFixed(): void {
    this.limiteInferior = 0;
    this.limiteSuperior = this.values.length - 1;
  }

  /** Obtener todos los elementos del slider */
  private obtenerTodosElementosSliders(): CustomRangeElementDirective[] {
    return [
      this.fullBarElement,
      this.selectionBarElement,
      this.minHandleElement,
      this.maxHandleElement,
      this.minHandleLabelElement,
      this.maxHandleLabelElement
    ];
  }

  /** Calcular dimensiones del slider */
  private calcularDimensiones(): void {
    this.minHandleElement.calcularDimension();
    const handleWidth: number = this.minHandleElement.dimension;

    this.handleHalfDimension = handleWidth / 2;
    this.fullBarElement.calcularDimension();

    this.maximaPosicionDeslizable = this.fullBarElement.dimension - handleWidth;

    if (this.componenteInicializado) {
      this.actualizarDeslizables();
    }
  }

  /** Procesar cambios en el tamanio de la pantalla */
  private procesarReajustePantalla(): void {
    this.calcularDimensiones();
    this.changeDetectionRef.detectChanges();
  }

  /** Actualizar los deslizables y la barra de seleccionados */
  private actualizarDeslizables(): void {
    this.actualizarDeslizableInferior(this.obtenerPosicionDelValor(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.obtenerPosicionDelValor(this.vistaValorSuperior));
    this.actualizarBarraSelecionados();
  }

  /** Actualizar elementos deslizables por tipo de punto */
  private actualizarDeslizablesPorTipo(tipoPunto: TipoPunto, nuevaPosicion: number): void {
    if (tipoPunto === TipoPunto.Min) {
      this.actualizarDeslizableInferior(nuevaPosicion);
    } else if (tipoPunto === TipoPunto.Max) {
      this.actualizarDeslizableSuperior(nuevaPosicion);
    }

    this.actualizarBarraSelecionados();
  }

  /** Actualiza el deslizable inferior y su valor mostrado */
  private actualizarDeslizableInferior(nuevaPosicion: number): void {
    this.minHandleElement.setPosition(nuevaPosicion);
    this.minHandleLabelElement.setValue(this.obtenerValorLabel(this.vistaValorInferior));
  }

  /** Actualiza el deslizable superior y su valor mostrado */
  private actualizarDeslizableSuperior(nuevaPosicion: number): void {
    this.maxHandleElement.setPosition(nuevaPosicion);
    this.maxHandleLabelElement.setValue(this.obtenerValorLabel(this.vistaValorSuperior));
  }

  /** Actualiza el ancho y la posicion de la barra entre los dos puntos seleccionados. */
  private actualizarBarraSelecionados(): void {
    const posicionRangoSeleccionado: number = this.minHandleElement.position + this.handleHalfDimension;
    let dimension = Math.abs(this.maxHandleElement.position - this.minHandleElement.position);
    let posicion = posicionRangoSeleccionado;
    this.selectionBarElement.aplicarDimension(dimension);
    this.selectionBarElement.setPosition(posicion);
  }

  /** Obtiene el valor normal o el valor del nodo si es de tipo fijo el slider.*/
  private obtenerValorLabel(value: number): string {
    if (this.type === TipoSlider.Fixed) {
      value = this.obtenerValorNodo(value);
    }
    return String('€' + value);
  }

  /** Redondear valor al step mas cercano basado en el valor minimo */
  private redondearNodo(value: number): number {
    let diferenciaNodo: number = UtilsHelper.roundToPrecisionLimit(
      value - this.limiteInferior,
      this.cantidadDecimales
    );

    diferenciaNodo = Math.round(diferenciaNodo);
    return UtilsHelper.roundToPrecisionLimit(this.limiteInferior + diferenciaNodo, this.cantidadDecimales);
  }

  /** Obtiene la posicion a partir del valor */
  private obtenerPosicionDelValor(valor: number): number {
    let porcentaje: number = UtilsHelper.linearValueToPosition(
      valor,
      this.limiteInferior,
      this.limiteSuperior
    );
    if (UtilsHelper.esIndefinidoONulo(porcentaje)) porcentaje = 0;
    return porcentaje * this.maximaPosicionDeslizable;
  }

  /** Obtiene el valor de la posicion */
  private obtenerValorDeLaPosicion(posicion: number): number {
    let porcentaje: number = posicion / this.maximaPosicionDeslizable;
    const value: number = UtilsHelper.linearPositionToValue(
      porcentaje,
      this.limiteInferior,
      this.limiteSuperior
    );
    return !UtilsHelper.esIndefinidoONulo(value) ? value : 0;
  }

  /** Obtener la posicion del evento */
  private obtenerPosicionDelEvento(event: MouseEvent): number {
    const sliderElementBoundingRect: ClientRect = this.elementRef.nativeElement.getBoundingClientRect();

    const posicionDelSlider: number = sliderElementBoundingRect.left;
    let posicionEvento: number = 0;
    posicionEvento = event.clientX - posicionDelSlider;
    return posicionEvento - this.handleHalfDimension;
  }

  /** Obtener el deslizable mas cercano a la posicion */
  private obtenerDeslizableMasCercano(event: MouseEvent): TipoPunto {
    const posicion: number = this.obtenerPosicionDelEvento(event);
    const distanciaMinima: number = Math.abs(posicion - this.minHandleElement.position);
    const distanciaMaxima: number = Math.abs(posicion - this.maxHandleElement.position);

    if (distanciaMinima < distanciaMaxima) {
      return TipoPunto.Min;
    } else if (distanciaMinima > distanciaMaxima) {
      return TipoPunto.Max;
    }
    return posicion < this.minHandleElement.position ? TipoPunto.Min : TipoPunto.Max;
  }

  /** Activar los eventos en cada uno de los elementos del slider */
  private bindearEventos(): void {
    const simularMovimiento = true;
    this.selectionBarElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(null, event, true, true, simularMovimiento)
    );

    this.fullBarElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(null, event, true, true, simularMovimiento)
    );

    this.minHandleElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(TipoPunto.Min, event, true, true)
    );

    this.maxHandleElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(TipoPunto.Max, event, true, true)
    );

    if (this.type === TipoSlider.Normal) {
      this.inputValorElement.activarEvento('blur', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Min)
      );

      this.inputValorElement.activarEvento('keyup.enter', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Min)
      );

      this.inputValorSuperiorElement.activarEvento('blur', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Max)
      );

      this.inputValorSuperiorElement.activarEvento('keyup.enter', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Max)
      );
    }
  }

  /** Desactivar los eventos en cada uno de los elementos del slider */
  private desbindearEventos(): void {
    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();

    for (const element of this.obtenerTodosElementosSliders()) {
      if (!UtilsHelper.esIndefinidoONulo(element)) {
        element.desactivarEventosElemento();
      }
    }
  }

  /** ControlValueAccessor inicio*/
  public writeValue(obj: any): void {
    if (!UtilsHelper.esIndefinidoONulo(obj) && obj instanceof Array) {
      this.valor = obj[0];
      this.valorSuperior = obj[1];

      this.inputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        internalChange: true
      });
    }
  }

  public registerOnChange(onChangeCallback: any): void {
    this.onChangeCallback = onChangeCallback;
  }

  public registerOnTouched(onTouchedCallback: any): void {
    this.onTouchedCallback = onTouchedCallback;
  }
  /** ControlValueAccessor fin*/

  /** Actualiza el valor recibido de los inputs */
  setNuevoValor(nuevoValor: number, tipoPunto: TipoPunto) {
    this.tipoPuntoActivo = tipoPunto;
    let nuevoValorInput;
    if (tipoPunto === TipoPunto.Min) {
      nuevoValorInput = {
        valor: nuevoValor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        internalChange: true
      };
      this.valorEditable = false;
    } else {
      nuevoValorInput = {
        valor: this.valor,
        valorSuperior: nuevoValor,
        forceChange: true,
        internalChange: true
      };
      this.valorSuperiorEditable = false;
    }

    this.inputModelChangeSubject.next(nuevoValorInput);
  }

  /** Click en el label inferior */
  onClickInferiorLabel() {
    if (this.type === TipoSlider.Normal) {
      this.valorEditable = !this.valorEditable;
      const element = this.renderer.selectRootElement('#valorElement');
      setTimeout(() => {
        element.focus();
        element.select();
      }, 0);
    }
  }

  /** Click en el label superior */
  onClickSuperiorLabel() {
    if (this.type === TipoSlider.Normal) {
      this.valorSuperiorEditable = !this.valorSuperiorEditable;
      const element = this.renderer.selectRootElement('#valorSuperiorElement');
      setTimeout(() => {
        element.focus();
        element.select();
      }, 0);
    }
  }

  /** Empieza el evento  */
  private onStartEvent(
    tipoPunto: TipoPunto,
    event: MouseEvent,
    bindMove: boolean,
    bindEnd: boolean,
    simularMovimiento?: boolean
  ): void {
    event.stopPropagation();
    event.preventDefault();
    if (UtilsHelper.esIndefinidoONulo(tipoPunto)) {
      tipoPunto = this.obtenerDeslizableMasCercano(event);
    }

    this.tipoPuntoActivo = tipoPunto;

    const deslizableElement: CustomRangeHandleDirective = this.obtenerDeslizableElement(tipoPunto);
    deslizableElement.active = true;
    if (bindMove) {
      this.unsubscribeOnMove();

      const onMoveCallback: (e: MouseEvent) => void = (e: MouseEvent): void => this.onMoveEvent(e);

      this.onMoveEventListener = this.eventListenerHelper.activarEvento(
        document,
        'mousemove',
        onMoveCallback,
        50
      );
    }

    if (bindEnd) {
      this.unsubscribeOnEnd();

      const onEndCallback: (e: MouseEvent) => void = (e: MouseEvent): void => this.onEndEvent();
      this.onEndEventListener = this.eventListenerHelper.activarEvento(document, 'mouseup', onEndCallback);
    }

    if (simularMovimiento) {
      this.onMoveEvent(event);
    }
  }

  /** Movimiento de los deslizables a la posicion destino */
  private onMoveEvent(event: MouseEvent): void {
    const nuevaPosicion: number = this.obtenerPosicionDelEvento(event);
    let nuevoValor: number;
    if (nuevaPosicion <= 0) {
      nuevoValor = this.limiteInferior;
    } else if (nuevaPosicion >= this.maximaPosicionDeslizable) {
      nuevoValor = this.limiteSuperior;
    } else {
      nuevoValor = this.obtenerValorDeLaPosicion(nuevaPosicion);
      nuevoValor = this.redondearNodo(nuevoValor);
    }
    this.actualizarPosicionDeslizable(nuevoValor);
  }

  /** Finalizacion del evento en curso */
  private onEndEvent(): void {
    this.deslizable.activo = false;
    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();
    this.rangeChange.emit(this.slideValores);
  }

  // /** Movimiento de los deslizables */
  // private onDragMove(event?: MouseEvent): void {
  //   console.log('onDragMove');
  //   const newPos: number = this.obtenerPosicionDelEvento(event);
  //   let newMinValue = this.getMinValue(newPos);
  //   let newMaxValue = this.getMaxValue(newPos);
  //   this.actualizarBarraElementosSeleccionados(newMinValue, newMaxValue);
  // }

  // /** Obtener el nuevo valor a partir de la posicion */
  // private getMinValue(posicion: number): number {
  //   let value = this.obtenerValorDeLaPosicion(posicion - this.deslizable.limiteInferior);
  //   return this.redondearNodo(value);
  // }

  // /** Obtener el nuevo valor a partir de la posicion */
  // private getMaxValue(posicion: number): number {
  //   let value =
  //     this.obtenerValorDeLaPosicion(posicion - this.deslizable.limiteInferior) + this.deslizable.diferencia;
  //   return this.redondearNodo(value);
  // }

  // /** Actualiza los valores y posicion de la barra de elementos seleccionados */
  // private actualizarBarraElementosSeleccionados(newMinValue: number, newMaxValue: number): void {
  //   this.vistaValorInferior = newMinValue;
  //   this.vistaValorSuperior = newMaxValue;
  //   this.aplicarCambiosAlModelo();
  //   this.actualizarDeslizables(TipoPunto.Min, this.obtenerPosicionDelValor(newMinValue));
  //   this.actualizarDeslizables(TipoPunto.Max, this.obtenerPosicionDelValor(newMaxValue));
  // }

  // Set the new value and position to the current tracking handle
  private actualizarPosicionDeslizable(nuevoValor: number): void {
    if (this.tipoPuntoActivo === TipoPunto.Min && nuevoValor > this.vistaValorSuperior) {
      nuevoValor = this.vistaValorSuperior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max && nuevoValor < this.vistaValorInferior) {
      nuevoValor = this.vistaValorInferior;
    }

    if (this.obtenerValorVistaActual() !== nuevoValor) {
      if (this.tipoPuntoActivo === TipoPunto.Min) {
        this.vistaValorInferior = nuevoValor;
        this.actualizarModelo();
      } else if (this.tipoPuntoActivo === TipoPunto.Max) {
        this.vistaValorSuperior = nuevoValor;
        this.actualizarModelo();
      }
      this.actualizarDeslizablesPorTipo(this.tipoPuntoActivo, this.obtenerPosicionDelValor(nuevoValor));
    }
  }

  public ngOnDestroy(): void {
    this.desbindearEventos();
    this.unsubscribeOutputModelChangeSubject();
    this.unsubscribeInputModelChangeSubject();
  }
}
