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
import { distinctUntilChanged, filter, tap, throttleTime } from 'rxjs/operators';
import { CustomRangeElementDirective } from '../directives/custom-range-element.directive';
import { EventosHelper, UtilsHelper } from '../helpers';
import {
  Config,
  Deslizable,
  EventListener,
  InputModelChange,
  ModelChange,
  OutputModelChange,
  SliderChange,
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
  // Inputs
  @Input('ngModel') slideValores: number[];
  @Input() type: string = TipoSlider.Normal;
  @Input() min: number;
  @Input() max: number;
  @Input() values: number[] = null;

  // Output for low value slider to support two-way bindings
  @Output()
  valueChange: EventEmitter<number> = new EventEmitter();

  valor: number = null;
  valorSuperior: number = null;

  // Output for high value slider to support two-way bindings
  @Output()
  valorSuperiorChange: EventEmitter<number> = new EventEmitter();

  // Event emitted when user starts interaction with the slider
  // @Output()
  // userChangeStart: EventEmitter<SliderChange> = new EventEmitter();

  // Event emitted on each change coming from user interaction
  @Output()
  userChange: EventEmitter<SliderChange> = new EventEmitter();

  // Event emitted when user finishes interaction with the slider
  @Output()
  userChangeEnd: EventEmitter<SliderChange> = new EventEmitter();

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

  // Low value synced to model low value
  private vistaValorInferior: number = null;
  // High value synced to model high value
  private vistaValorSuperior: number = null;
  // Options synced to model options, based on defaults
  private configuracion: Config = new Config();

  // Half of the width or height of the slider handles
  private handleHalfDimension: number = 0;
  // Maximum position the slider handle can have
  private maxHandlePosition: number = 0;

  // Which handle is currently tracked for move events
  private tipoPuntoActivo: TipoPunto = null;
  // Values recorded when first dragging the bar
  private deslizable: Deslizable = new Deslizable();

  /* Slider DOM elements */
  // The whole slider bar
  @ViewChild('valorElement', { read: CustomRangeElementDirective })
  inputValorElement: CustomRangeElementDirective;

  @ViewChild('valorSuperiorElement', { read: CustomRangeElementDirective })
  inputValorSuperiorElement: CustomRangeElementDirective;

  @ViewChild('fullBar', { read: CustomRangeElementDirective })
  fullBarElement: CustomRangeElementDirective;

  // Highlight between two handles
  @ViewChild('selectionBar', { read: CustomRangeElementDirective })
  selectionBarElement: CustomRangeElementDirective;

  // Left slider handle
  @ViewChild('minHandle', { read: CustomRangeHandleDirective })
  minHandleElement: CustomRangeHandleDirective;

  // Right slider handle
  @ViewChild('maxHandle', { read: CustomRangeHandleDirective })
  maxHandleElement: CustomRangeHandleDirective;

  // Label above the low value
  @ViewChild('minHandleLabel', { read: CustomRangeLabelDirective })
  minHandleLabelElement: CustomRangeLabelDirective;

  // Label above the high value
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
    // Then value changes
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

    // Once we apply options, we need to normalise model values for the first time
    this.renormaliseSliderValores();

    this.vistaValorInferior = this.aplicarValorVista(this.valor);
    this.vistaValorSuperior = this.aplicarValorVista(this.valorSuperior);

    this.actualizarEscala();
    this.calcularDimensiones();
    this.inicializarDeslizables();
    this.manageEventsBindings();
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
        // distinctUntilChanged(ModelChange.compare),
        // filter((modelChange: InputModelChange) => modelChange.forceChange),
        throttleTime(interval, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: InputModelChange) => this.applyInputModelChange(modelChange));
  }

  private subscribeOutputModelChangeSubject(interval?: number): void {
    this.outputModelChangeSubscription = this.outputModelChangeSubject
      .pipe(
        // distinctUntilChanged(ModelChange.compare),
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

  private getCurrentTrackingValue(): number {
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

    if (!UtilsHelper.esIndefinidoONulo(this.values)) {
      console.log(+modelValue);
      return UtilsHelper.obtenerIndiceNodo(+modelValue, this.values);
    }
    console.log(+modelValue);
    return +modelValue;
  }

  private aplicarValorModelo(viewValue: number): number {
    if (!UtilsHelper.esIndefinidoONulo(this.values)) {
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
    const valoresNormalizados: SliderValores = this.normalizarValores(modelChange);

    let valoresSobrepasados = false;
    if (valoresNormalizados.valor > this.vistaValorSuperior) {
      valoresNormalizados.valor = this.vistaValorSuperior;
      valoresSobrepasados = true;
    }

    if (valoresNormalizados.valorSuperior < this.vistaValorInferior) {
      valoresNormalizados.valorSuperior = this.vistaValorInferior;
      valoresSobrepasados = true;
    }

    // if (!valoresSobrepasados) {
    // If normalised model change is different, apply the change to the model values
    const normalisationChange: boolean = !SliderValores.compare(modelChange, valoresNormalizados);
    if (normalisationChange) {
      this.valor = valoresNormalizados.valor;
      this.valorSuperior = valoresNormalizados.valorSuperior;
    } else {
      console.log(modelChange);
      console.log(valoresNormalizados);
    }

    this.vistaValorInferior = this.aplicarValorVista(valoresNormalizados.valor);
    this.vistaValorSuperior = this.aplicarValorVista(valoresNormalizados.valorSuperior);

    this.actualizarDeslizableInferior(this.valorAPosicion(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.valorAPosicion(this.vistaValorSuperior));
    this.updateSelectionBar();

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
      this.userChange.emit(this.getSliderChange());
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

    if (!UtilsHelper.esIndefinidoONulo(this.values)) {
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

  private renormaliseSliderValores(): void {
    const previousSliderValores: SliderValores = {
      valor: this.valor,
      valorSuperior: this.valorSuperior
    };
    const normalisedSliderValores: SliderValores = this.normalizarValores(previousSliderValores);
    if (!SliderValores.compare(normalisedSliderValores, previousSliderValores)) {
      this.valor = normalisedSliderValores.valor;
      this.valorSuperior = normalisedSliderValores.valorSuperior;

      this.outputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        userEventInitiated: false
      });
    }
  }

  // Read the user options and apply them to the slider model
  private aplicarConfiguracion(): void {
    this.configuracion.showSelectionBar =
      this.configuracion.showSelectionBar ||
      this.configuracion.showSelectionBarEnd ||
      !UtilsHelper.esIndefinidoONulo(this.configuracion.showSelectionBarFromValue);

    if (this.type === TipoSlider.Fixed) {
      this.aplicarConfiguracionFixed();
    } else {
      this.aplicarConfiguracionNormal();
    }
  }

  private aplicarConfiguracionFixed(): void {
    this.configuracion.limiteInferior = 0;
    this.configuracion.limiteSuperior = this.values.length - 1;
    this.configuracion.nodo = 1;
  }

  private aplicarConfiguracionNormal(): void {
    if (UtilsHelper.esIndefinidoONulo(this.configuracion.nodo)) {
      this.configuracion.nodo = 1;
    } else {
      this.configuracion.nodo = +this.configuracion.nodo;
      if (this.configuracion.nodo <= 0) {
        this.configuracion.nodo = 1;
      }
    }

    this.configuracion.limiteSuperior = +this.configuracion.limiteSuperior;
    this.configuracion.limiteInferior = +this.configuracion.limiteInferior;
  }

  // Manage the events bindings based on readOnly and disabled options
  private manageEventsBindings(): void {
    this.bindearEventos();
  }

  private actualizarEscala(): void {
    let elements = this.obtenerTodosElementosSliders();
    for (const element of elements) {
      element.setScale(this.configuracion.scale);
    }
  }

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

  private inicializarDeslizables(): void {
    this.actualizarDeslizableInferior(this.valorAPosicion(this.vistaValorInferior));
    this.actualizarDeslizableSuperior(this.valorAPosicion(this.vistaValorSuperior));
    this.updateSelectionBar();
  }

  // Calculate dimensions that are dependent on view port size
  // Run once during initialization and every time view port changes size.
  private calcularDimensiones(): void {
    this.minHandleElement.calcularDimension();
    const handleWidth: number = this.minHandleElement.dimension;

    this.handleHalfDimension = handleWidth / 2;
    this.fullBarElement.calcularDimension();

    this.maxHandlePosition = this.fullBarElement.dimension - handleWidth;

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

  // Update slider handles and label positions
  private actualizarDeslizables(tipoPunto: TipoPunto, newPos: number): void {
    if (tipoPunto === TipoPunto.Min) {
      this.actualizarDeslizableInferior(newPos);
    } else if (tipoPunto === TipoPunto.Max) {
      this.actualizarDeslizableSuperior(newPos);
    }

    this.updateSelectionBar();
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

  // Update low slider handle position and label
  private actualizarDeslizableInferior(newPos: number): void {
    this.minHandleElement.setPosition(newPos);
    this.minHandleLabelElement.setValue(this.getDisplayValue(this.vistaValorInferior));
    this.minHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Min, newPos));
  }

  // Update high slider handle position and label
  private actualizarDeslizableSuperior(newPos: number): void {
    this.maxHandleElement.setPosition(newPos);
    this.maxHandleLabelElement.setValue(this.getDisplayValue(this.vistaValorSuperior));
    this.maxHandleLabelElement.setPosition(this.getHandleLabelPos(TipoPunto.Max, newPos));
  }

  // Update slider selection bar, combined label and range label
  private updateSelectionBar(): void {
    let position: number = 0;
    let dimension: number = 0;
    const positionForRange: number = this.minHandleElement.position + this.handleHalfDimension;

    dimension = Math.abs(this.maxHandleElement.position - this.minHandleElement.position);
    position = positionForRange;
    this.selectionBarElement.aplicarDimension(dimension);
    this.selectionBarElement.setPosition(position);
  }

  private getDisplayValue(value: number): string {
    if (this.type === TipoSlider.Fixed) {
      value = this.obtenerValorNodo(value);
    }
    return String('€' + value);
  }

  // Round value to step and precision based on minValue
  private redondearNodo(value: number): number {
    let diferenciaNodo: number = UtilsHelper.roundToPrecisionLimit(
      (value - this.configuracion.limiteInferior) / this.configuracion.nodo,
      this.configuracion.precisionLimit
    );

    diferenciaNodo = Math.round(diferenciaNodo) * this.configuracion.nodo;
    return UtilsHelper.roundToPrecisionLimit(
      this.configuracion.limiteInferior + diferenciaNodo,
      this.configuracion.precisionLimit
    );
  }

  // Translate value to pixel position
  private valorAPosicion(val: number): number {
    val = UtilsHelper.clampToRange(val, this.configuracion.limiteInferior, this.configuracion.limiteSuperior);
    let percent: number = UtilsHelper.linearValueToPosition(
      val,
      this.configuracion.limiteInferior,
      this.configuracion.limiteSuperior
    );
    if (UtilsHelper.esIndefinidoONulo(percent)) {
      percent = 0;
    }
    return percent * this.maxHandlePosition;
  }

  // Translate position to model value
  private aplicarPosicionAlValor(position: number): number {
    let percent: number = position / this.maxHandlePosition;
    const value: number = UtilsHelper.linearPositionToValue(
      percent,
      this.configuracion.limiteInferior,
      this.configuracion.limiteSuperior
    );
    return !UtilsHelper.esIndefinidoONulo(value) ? value : 0;
  }

  // Compute the event position depending on whether the slider is horizontal or vertical
  private obtenerPosicion(event: MouseEvent): number {
    const sliderElementBoundingRect: ClientRect = this.elementRef.nativeElement.getBoundingClientRect();

    const sliderPos: number = sliderElementBoundingRect.left;
    let eventPos: number = 0;
    eventPos = event.clientX - sliderPos;
    return eventPos * this.configuracion.scale - this.handleHalfDimension;
  }

  private obtenerDeslizableMasCercano(event: MouseEvent): TipoPunto {
    const position: number = this.obtenerPosicion(event);
    const distanceMin: number = Math.abs(position - this.minHandleElement.position);
    const distanceMax: number = Math.abs(position - this.maxHandleElement.position);

    if (distanceMin < distanceMax) {
      return TipoPunto.Min;
    } else if (distanceMin > distanceMax) {
      return TipoPunto.Max;
    }
    return position < this.minHandleElement.position ? TipoPunto.Min : TipoPunto.Max;
  }

  // Bind mouse and touch events to slider handles
  private bindearEventos(): void {
    this.selectionBarElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStart(null, event, true, true, true)
    );

    this.minHandleElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStart(TipoPunto.Min, event, true, true)
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

    this.maxHandleElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStart(TipoPunto.Max, event, true, true)
    );

    this.fullBarElement.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStart(null, event, true, true, true)
    );
  }

  // Unbind mouse and touch events to slider handles
  private desbindearEventos(): void {
    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();

    for (const element of this.obtenerTodosElementosSliders()) {
      if (!UtilsHelper.esIndefinidoONulo(element)) {
        element.desactivarEvento();
      }
    }
  }

  // ControlValueAccessor interface
  public writeValue(obj: any): void {
    if (!UtilsHelper.esIndefinidoONulo(obj) && obj instanceof Array) {
      this.valor = obj[0];
      this.valorSuperior = obj[1];

      // ngOnChanges() is not called in this instance, so we need to communicate the change manually
      this.inputModelChangeSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        internalChange: true
      });
    }
  }

  // ControlValueAccessor interface
  public registerOnChange(onChangeCallback: any): void {
    this.onChangeCallback = onChangeCallback;
  }

  // ControlValueAccessor interface
  public registerOnTouched(onTouchedCallback: any): void {
    this.onTouchedCallback = onTouchedCallback;
  }

  setNuevoValor(nuevoValor: number, tipoPunto: TipoPunto) {
    this.tipoPuntoActivo = tipoPunto;
    let inputModelChange;
    if (tipoPunto === TipoPunto.Min) {
      inputModelChange = {
        valor: nuevoValor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        internalChange: true
      };
    } else {
      inputModelChange = {
        valor: this.valor,
        valorSuperior: nuevoValor,
        forceChange: true,
        internalChange: true
      };
    }

    // let newValues = [Number(nuevoValor), this.valorSuperior];
    // this.slideValores = newValues;

    // this.actualizarPosicionDeslizable(nuevoValor);
    this.inputModelChangeSubject.next(inputModelChange);
  }

  // onStart event handler
  private onStart(
    tipoPunto: TipoPunto,
    event: MouseEvent,
    bindMove: boolean,
    bindEnd: boolean,
    simulateImmediateMove?: boolean
  ): void {
    event.stopPropagation();
    event.preventDefault();
    this.calcularDimensiones();

    if (UtilsHelper.esIndefinidoONulo(tipoPunto)) {
      tipoPunto = this.obtenerDeslizableMasCercano(event);
    }

    this.tipoPuntoActivo = tipoPunto;

    const deslizableElement: CustomRangeHandleDirective = this.obtenerDeslizableElement(tipoPunto);
    deslizableElement.active = true;
    if (bindMove) {
      this.unsubscribeOnMove();

      const onMoveCallback: (e: MouseEvent) => void = (e: MouseEvent): void =>
        this.deslizable.activo ? this.onDragMove(e) : this.onMove(e);

      this.onMoveEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mousemove',
        onMoveCallback,
        this.configuracion.mouseEventsInterval
      );
    }

    if (bindEnd) {
      this.unsubscribeOnEnd();

      const onEndCallback: (e: MouseEvent) => void = (e: MouseEvent): void => this.onEnd();
      this.onEndEventListener = this.eventListenerHelper.attachEventListener(
        document,
        'mouseup',
        onEndCallback
      );
    }

    // this.userChangeStart.emit(this.getSliderChange());

    // Click events, either with mouse or touch gesture are weird. Sometimes they result in full
    // start, move, end sequence, and sometimes, they don't - they only invoke mousedown
    // As a workaround, we simulate the first move event and the end event if it's necessary
    if (simulateImmediateMove) {
      this.onMove(event);
    }
  }

  private onMove(event: MouseEvent): void {
    const nuevaPosicion: number = this.obtenerPosicion(event);
    let nuevoValor: number;
    if (nuevaPosicion <= 0) {
      nuevoValor = this.configuracion.limiteInferior;
    } else if (nuevaPosicion >= this.maxHandlePosition) {
      nuevoValor = this.configuracion.limiteSuperior;
    } else {
      nuevoValor = this.aplicarPosicionAlValor(nuevaPosicion);
      nuevoValor = this.redondearNodo(nuevoValor);
    }
    this.actualizarPosicionDeslizable(nuevoValor);
  }

  private onEnd(): void {
    this.deslizable.activo = false;
    this.unsubscribeOnMove();
    this.unsubscribeOnEnd();
    this.userChangeEnd.emit(this.getSliderChange());
  }

  /** Get min value depending on whether the newPos is outOfBounds above or below the bar */
  private getMinValue(newPos: number, outOfBounds: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      value = this.configuracion.limiteInferior;
    } else {
      value = this.aplicarPosicionAlValor(newPos - this.deslizable.limiteInferior);
    }
    return this.redondearNodo(value);
  }

  /** Get max value depending on whether the newPos is outOfBounds above or below the bar */
  private getMaxValue(newPos: number, outOfBounds: boolean): number {
    let value: number = null;

    if (outOfBounds) {
      value = this.configuracion.limiteInferior + this.deslizable.diferencia;
    } else {
      value =
        this.aplicarPosicionAlValor(newPos - this.deslizable.limiteInferior) + this.deslizable.diferencia;
    }

    return this.redondearNodo(value);
  }

  private onDragMove(event?: MouseEvent): void {
    const newPos: number = this.obtenerPosicion(event);
    let newMinValue = this.getMinValue(newPos, false);
    let newMaxValue = this.getMaxValue(newPos, false);
    this.posicionElementosSeleccionados(newMinValue, newMaxValue);
  }

  // Set the new value and position for the entire bar
  private posicionElementosSeleccionados(newMinValue: number, newMaxValue: number): void {
    this.vistaValorInferior = newMinValue;
    this.vistaValorSuperior = newMaxValue;
    this.aplicarCambiosAlModelo();
    this.actualizarDeslizables(TipoPunto.Min, this.valorAPosicion(newMinValue));
    this.actualizarDeslizables(TipoPunto.Max, this.valorAPosicion(newMaxValue));
  }

  // Set the new value and position to the current tracking handle
  private actualizarPosicionDeslizable(nuevoValor: number): void {
    if (this.tipoPuntoActivo === TipoPunto.Min && nuevoValor > this.vistaValorSuperior) {
      nuevoValor = this.vistaValorSuperior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max && nuevoValor < this.vistaValorInferior) {
      nuevoValor = this.vistaValorInferior;
    }

    if (this.getCurrentTrackingValue() !== nuevoValor) {
      if (this.tipoPuntoActivo === TipoPunto.Min) {
        this.vistaValorInferior = nuevoValor;
        this.aplicarCambiosAlModelo();
      } else if (this.tipoPuntoActivo === TipoPunto.Max) {
        this.vistaValorSuperior = nuevoValor;
        this.aplicarCambiosAlModelo();
      }
      this.actualizarDeslizables(this.tipoPuntoActivo, this.valorAPosicion(nuevoValor));
    }
  }

  private getSliderChange(): SliderChange {
    const sliderChange: SliderChange = new SliderChange();
    sliderChange.tipoPunto = this.tipoPuntoActivo;
    sliderChange.valor = +this.valor;
    sliderChange.valorSuperior = +this.valorSuperior;
    return sliderChange;
  }

  public ngOnDestroy(): void {
    this.desbindearEventos();
    this.unsubscribeOutputModelChangeSubject();
    this.unsubscribeInputModelChangeSubject();
  }
}
