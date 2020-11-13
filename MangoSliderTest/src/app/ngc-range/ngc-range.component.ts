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
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, throttleTime } from 'rxjs/operators';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { EventosHelper, UtilsHelper } from '../helpers';
import {
  Config,
  Deslizable,
  EventListener,
  InputModelChange,
  ModelChange,
  OutputModelChange,
  SliderValores,
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
  host: { class: 'ngx-slider' },
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

  valor: number = null;
  valorEditable = false;
  valorSuperior: number = null;
  valorSuperiorEditable = null;

  // Set to true if init method already executed
  private initHasRun: boolean = false;

  // Changes in model inputs are passed through this subject
  // These are all changes coming in from outside the component through input bindings or reactive form inputs
  private inputModelChangeSubject: Subject<InputModelChange> = new Subject<InputModelChange>();
  private inputModelChangeSubscription: Subscription = null;

  // Changes to model outputs are passed through this subject
  // These are all changes that need to be communicated to output emitters and registered callbacks
  private outputModelChangeSubject: Subject<OutputModelChange> = new Subject<OutputModelChange>();
  private outputModelChangeSubscription: Subscription = null;

  private vistaValorInferior: number = null;
  private vistaValorSuperior: number = null;

  private configuracion: Config = new Config();

  private handleHalfDimension: number = 0;

  private deslizable = new Deslizable();
  private maximaPosicionDeslizable: number = 0;

  tipoPuntoActivo: TipoPunto = null;

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

  // Event listeners
  private eventListenerHelper: EventosHelper = null;
  private onMoveEventListener: EventListener = null;
  private onEndEventListener: EventListener = null;

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

  // OnInit interface
  public ngOnInit(): void {
    if (this.type === TipoSlider.Fixed) {
      this.valor = this.values[0];
      this.valorSuperior = this.values[this.values.length - 1];
    } else {
      this.configuracion.limiteInferior = this.min;
      this.configuracion.limiteSuperior = this.max;
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

  // AfterViewInit interface
  public ngAfterViewInit(): void {
    this.aplicarConfiguracion();
    this.subscribeInputModelChangeSubject(this.configuracion.inputEventsInterval);
    this.subscribeOutputModelChangeSubject(this.configuracion.outputEventsInterval);

    this.vistaValorInferior = this.aplicarValorVista(this.valor);
    this.vistaValorSuperior = this.aplicarValorVista(this.valorSuperior);

    // this.actualizarEscala();
    this.calcularDimensiones();
    this.inicializarDeslizables();
    this.bindearEventos();
    this.initHasRun = true;

    // Run change detection manually to resolve some issues when init procedure changes values used in the view
    if (!this.isRefDestroyed()) {
      this.changeDetectionRef.detectChanges();
    }
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any): void {
    this.calculateViewDimensionsAndDetectChanges();
  }

  private subscribeInputModelChangeSubject(interval?: number): void {
    this.inputModelChangeSubscription = this.inputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        filter((modelChange: InputModelChange) => modelChange.forceChange),
        throttleTime(interval, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: InputModelChange) => this.applyInputModelChange(modelChange));
  }

  private subscribeOutputModelChangeSubject(interval?: number): void {
    this.outputModelChangeSubscription = this.outputModelChangeSubject
      .pipe(
        distinctUntilChanged(ModelChange.compare),
        throttleTime(interval, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: OutputModelChange) => this.publishOutputModelChange(modelChange));
  }

  private unsubscribeOnMove(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.onMoveEventListener)) {
      this.eventListenerHelper.detachEventListener(this.onMoveEventListener);
      this.onMoveEventListener = null;
    }
  }

  private unsubscribeOnEnd(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.onEndEventListener)) {
      this.eventListenerHelper.detachEventListener(this.onEndEventListener);
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

  private aplicarValorVista(modelValue: number): number {
    if (UtilsHelper.esIndefinidoONulo(modelValue)) {
      return NaN;
    }

    if (this.type === TipoSlider.Fixed) {
      console.log(+modelValue);
      return UtilsHelper.obtenerIndiceNodo(+modelValue, this.values);
    }
    console.log(+modelValue);
    return +modelValue;
  }

  private aplicarValorModelo(viewValue: number): number {
    if (this.type === TipoSlider.Fixed) {
      console.log(+viewValue);
      return this.obtenerValorNodo(viewValue);
    }
    console.log(+viewValue);
    return viewValue;
  }

  private obtenerValorNodo(sliderValor: number): number {
    const nodo: number = this.values[sliderValor];
    return !UtilsHelper.esIndefinidoONulo(nodo) ? nodo : NaN;
  }

  private aplicarCambiosAlModelo(): void {
    this.valor = this.aplicarValorModelo(this.vistaValorInferior);
    this.valorSuperior = this.aplicarValorModelo(this.vistaValorSuperior);

    this.outputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      userEventInitiated: true,
      forceChange: false
    });

    // At this point all changes are applied and outputs are emitted, so we should be done.
    // However, input changes are communicated in different stream and we need to be ready to
    // act on the next input change even if it is exactly the same as last input change.
    // Therefore, we send a special event to reset the stream.
    this.inputModelChangeSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      forceChange: false,
      internalChange: true
    });
  }

  // Apply model change to the slider view
  private applyInputModelChange(modelChange: InputModelChange): void {
    console.log(modelChange);
    const valoresNormalizados: SliderValores = this.normalizarValores(modelChange);

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
    const normalisationChange: boolean = !SliderValores.compare(modelChange, valoresNormalizados);
    if (normalisationChange) {
      this.valor = valoresNormalizados.valor;
      this.valorSuperior = valoresNormalizados.valorSuperior;
    }

    this.vistaValorInferior = this.aplicarValorVista(valoresNormalizados.valor);
    this.vistaValorSuperior = this.aplicarValorVista(valoresNormalizados.valorSuperior);

    this.actualizarDeslizableInferior(this.obtenerPosicionDelValor(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.obtenerPosicionDelValor(this.vistaValorSuperior));
    this.actualizarBarraSelecionados();

    // At the end, we need to communicate the model change to the outputs as well
    // Normalisation changes are also always forced out to ensure that subscribers always end up in correct state
    this.outputModelChangeSubject.next({
      valor: valoresNormalizados.valor,
      valorSuperior: valoresNormalizados.valorSuperior,
      forceChange: normalisationChange,
      userEventInitiated: false
    });
  }

  // Publish model change to output event emitters and registered callbacks
  private publishOutputModelChange(modelChange: OutputModelChange): void {
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
      // If this change was initiated by a user event, we can emit outputs in the same tick
      emitOutputs();
      // this.userChange.emit(this.getSliderChange());
    } else {
      // But, if the change was initated by something else like a change in input bindings,
      // we need to wait until next tick to emit the outputs to keep Angular change detection happy
      setTimeout(() => {
        emitOutputs();
      });
    }
  }

  private normalizarValores(input: SliderValores): SliderValores {
    const inputNormalizado: SliderValores = new SliderValores();
    inputNormalizado.valor = input.valor;
    inputNormalizado.valorSuperior = input.valorSuperior;

    if (this.type === TipoSlider.Fixed) {
      // When using steps array, only round to nearest step in the array
      // No other enforcement can be done, as the step array may be out of order, and that is perfectly fine
      const valueIndex: number = UtilsHelper.obtenerIndiceNodo(inputNormalizado.valor, this.values);
      inputNormalizado.valor = this.values[valueIndex];

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

  /** Aplicar la configuracion al slider segun su tipo */
  private aplicarConfiguracion(): void {
    if (this.type === TipoSlider.Fixed) {
      this.aplicarConfiguracionFixed();
    } else {
      this.aplicarConfiguracionNormal();
    }
  }

  /** Aplicar la configuracion referida al slider con valores fijos */
  private aplicarConfiguracionFixed(): void {
    this.configuracion.limiteInferior = 0;
    this.configuracion.limiteSuperior = this.values.length - 1;
    this.configuracion.nodo = 1;
  }

  /** Aplicar la configuracion referida al slider normal */
  private aplicarConfiguracionNormal(): void {
    this.configuracion.nodo = +this.configuracion.nodo;
    if (this.configuracion.nodo <= 0) {
      this.configuracion.nodo = 1;
    }

    this.configuracion.limiteSuperior = +this.configuracion.limiteSuperior;
    this.configuracion.limiteInferior = +this.configuracion.limiteInferior;
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

  /** Inicializacion de los deslizables y la barra de seleccionados */
  private inicializarDeslizables(): void {
    this.actualizarDeslizableInferior(this.obtenerPosicionDelValor(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.obtenerPosicionDelValor(this.vistaValorSuperior));
    this.actualizarBarraSelecionados();
  }

  // Calculate dimensions that are dependent on view port size
  // Run once during initialization and every time view port changes size.
  private calcularDimensiones(): void {
    this.minHandleElement.calcularDimension();
    const handleWidth: number = this.minHandleElement.dimension;

    this.handleHalfDimension = handleWidth / 2;
    this.fullBarElement.calcularDimension();

    this.maximaPosicionDeslizable = this.fullBarElement.dimension - handleWidth;

    if (this.initHasRun) {
      this.inicializarDeslizables();
    }
  }

  private calculateViewDimensionsAndDetectChanges(): void {
    this.calcularDimensiones();
    if (!this.isRefDestroyed()) {
      this.changeDetectionRef.detectChanges();
    }
  }

  /**
   * If the slider reference is already destroyed
   * @returns boolean - true if ref is destroyed
   */
  private isRefDestroyed(): boolean {
    return this.changeDetectionRef['destroyed'];
  }

  /** Actualizar elementos deslizables (Inferior, Superior y Barra de seleccionados) */
  private actualizarDeslizables(tipoPunto: TipoPunto, newPos: number): void {
    if (tipoPunto === TipoPunto.Min) {
      this.actualizarDeslizableInferior(newPos);
    } else if (tipoPunto === TipoPunto.Max) {
      this.actualizarDeslizableSuperior(newPos);
    }

    this.actualizarBarraSelecionados();
  }

  // Helper function to work out the position for handle labels depending on RTL or not
  private getHandleLabelPos(labelType: TipoPunto, newPos: number): number {
    const labelDimension: number =
      labelType === TipoPunto.Min
        ? this.minHandleLabelElement.dimension
        : this.maxHandleLabelElement.dimension;
    const nearHandlePos: number = newPos - labelDimension / 2 + this.handleHalfDimension;
    const endOfBarPos: number = this.fullBarElement.dimension - labelDimension;

    if (labelType === TipoPunto.Max) {
      return Math.min(nearHandlePos, endOfBarPos);
    } else {
      return Math.min(Math.max(nearHandlePos, 0), endOfBarPos);
    }
  }

  /** Actualiza el deslizable inferior y su valor mostrado */
  private actualizarDeslizableInferior(newPos: number): void {
    this.minHandleElement.setPosition(newPos);
    this.minHandleLabelElement.setValue(this.obtenerValorSegunTipo(this.vistaValorInferior));
    this.minHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Min, newPos));
  }

  /** Actualiza el deslizable superior y su valor mostrado */
  private actualizarDeslizableSuperior(newPos: number): void {
    this.maxHandleElement.setPosition(newPos);
    this.maxHandleLabelElement.setValue(this.obtenerValorSegunTipo(this.vistaValorSuperior));
    this.maxHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Max, newPos));
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
  private obtenerValorSegunTipo(value: number): string {
    if (this.type === TipoSlider.Fixed) {
      value = this.obtenerValorNodo(value);
    }
    return String('€' + value);
  }

  /** Redondear valor al step mas cercano basado en el valor minimo */
  private redondearNodo(value: number): number {
    let diferenciaNodo: number = UtilsHelper.roundToPrecisionLimit(
      (value - this.configuracion.limiteInferior) / this.configuracion.nodo,
      this.configuracion.precisionLimit
    );

    diferenciaNodo = Math.round(diferenciaNodo) * this.configuracion.nodo;
    console.log({ diferenciaNodo });
    return UtilsHelper.roundToPrecisionLimit(
      this.configuracion.limiteInferior + diferenciaNodo,
      this.configuracion.precisionLimit
    );
  }

  /** Obtiene la posicion a partir del valor */
  private obtenerPosicionDelValor(valor: number): number {
    valor = UtilsHelper.clampToRange(
      valor,
      this.configuracion.limiteInferior,
      this.configuracion.limiteSuperior
    );
    let porcentaje: number = UtilsHelper.linearValueToPosition(
      valor,
      this.configuracion.limiteInferior,
      this.configuracion.limiteSuperior
    );
    if (UtilsHelper.esIndefinidoONulo(porcentaje)) {
      porcentaje = 0;
    }
    return porcentaje * this.maximaPosicionDeslizable;
  }

  /** Obtiene el valor de la posicion */
  private obtenerValorDeLaPosicion(posicion: number): number {
    let porcentaje: number = posicion / this.maximaPosicionDeslizable;
    const value: number = UtilsHelper.linearPositionToValue(
      porcentaje,
      this.configuracion.limiteInferior,
      this.configuracion.limiteSuperior
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
        element.desactivarEvento();
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

      this.onMoveEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mousemove',
        onMoveCallback,
        this.configuracion.mouseEventsInterval
      );
    }

    if (bindEnd) {
      this.unsubscribeOnEnd();

      const onEndCallback: (e: MouseEvent) => void = (e: MouseEvent): void => this.onEndEvent();
      this.onEndEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mouseup',
        onEndCallback
      );
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
      nuevoValor = this.configuracion.limiteInferior;
    } else if (nuevaPosicion >= this.maximaPosicionDeslizable) {
      nuevoValor = this.configuracion.limiteSuperior;
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
        this.aplicarCambiosAlModelo();
      } else if (this.tipoPuntoActivo === TipoPunto.Max) {
        this.vistaValorSuperior = nuevoValor;
        this.aplicarCambiosAlModelo();
      }
      this.actualizarDeslizables(this.tipoPuntoActivo, this.obtenerPosicionDelValor(nuevoValor));
    }
  }

  public ngOnDestroy(): void {
    this.desbindearEventos();
    this.unsubscribeOutputModelChangeSubject();
    this.unsubscribeInputModelChangeSubject();
  }
}
