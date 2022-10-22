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
import { NgcRangeDeslizableDirective } from '../directives/ngc-range-deslizable.directive';
import { NgcRangeElementoDirective } from '../directives/ngc-range-elemento.directive';
import { NgcRangeLabelDirective } from '../directives/ngc-range-label.directive';
import { EventosHelper, UtilsHelper } from '../helpers';
import {
  Deslizable,
  EventListener,
  InputNgcRangeModel,
  NgcRangeModel,
  OutputNgcRangeModel,
  TipoPunto,
  TipoSlider
} from '../models';

const CONTROL_VALUE_ACCESSOR: any = {
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
  providers: [CONTROL_VALUE_ACCESSOR]
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

  @ViewChild('valorElement', { read: NgcRangeElementoDirective })
  valorElement: NgcRangeElementoDirective;
  @ViewChild('valorSuperiorElement', { read: NgcRangeElementoDirective })
  valorSuperiorElement: NgcRangeElementoDirective;
  @ViewChild('barraSlider', { read: NgcRangeElementoDirective })
  barraSlider: NgcRangeElementoDirective;
  @ViewChild('barraSeleccionados', { read: NgcRangeElementoDirective })
  barraSeleccionados: NgcRangeElementoDirective;
  @ViewChild('deslizableInferior', { read: NgcRangeDeslizableDirective })
  deslizableInferior: NgcRangeDeslizableDirective;
  @ViewChild('deslizableSuperior', { read: NgcRangeDeslizableDirective })
  deslizableSuperior: NgcRangeDeslizableDirective;
  @ViewChild('labelInferior', { read: NgcRangeLabelDirective })
  labelInferior: NgcRangeLabelDirective;
  @ViewChild('labelSuperior', { read: NgcRangeLabelDirective })
  labelSuperior: NgcRangeLabelDirective;

  /** Refenencia de los valores actuales */
  valor: number = null;
  valorSuperior: number = null;

  /** Atributos para mostrar span o input en el label */
  valorEditable = false;
  valorSuperiorEditable = false;

  /** Input / Output subscripcion y subject */
  private inputNgcRangeModelSubject: Subject<InputNgcRangeModel> = new Subject<InputNgcRangeModel>();
  private outputNgcRangeModelSubject: Subject<OutputNgcRangeModel> = new Subject<OutputNgcRangeModel>();
  private inputNgcRangeModelSubscription: Subscription = null;
  private outputNgcRangeModelSubscription: Subscription = null;

  /** Listeners y helpers */
  private eventListenerHelper: EventosHelper = null;
  private onMoveEventListener: EventListener = null;
  private onEndEventListener: EventListener = null;

  /** Variables de configuracion y uso */
  private componenteInicializado: boolean = false;
  private cantidadDecimales: number = 8;
  private deslizableMediaDimension: number = 0;
  private maximaPosicionDeslizable: number = 0;
  private limiteInferior: number = 0;
  private limiteSuperior: number = null;
  private labelValorInferior: number = null;
  private labelValorSuperior: number = null;
  private deslizable = new Deslizable();
  private tipoPuntoActivo: TipoPunto = null;

  /** Callbacks para formularios reactivos */
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
      if (!UtilsHelper.esIndefinidoONulo(this.slideValores)) {
        this.valor = this.slideValores[0];
        this.valorSuperior = this.slideValores[1];
      } else {
        this.valor = this.values[0];
        this.valorSuperior = this.values[this.values.length - 1];
      }
    } else {
      this.limiteInferior = this.min;
      this.limiteSuperior = this.max;
      if (!UtilsHelper.esIndefinidoONulo(this.slideValores)) {
        this.valor = this.slideValores[0];
        this.valorSuperior = this.slideValores[1];
      } else {
        this.valor = this.min;
        this.valorSuperior = this.max;
      }
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (
      !UtilsHelper.esIndefinidoONulo(changes.valor) ||
      !UtilsHelper.esIndefinidoONulo(changes.valorSuperior)
    ) {
      this.inputNgcRangeModelSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: false,
        cambioInterno: false
      });
    }
  }

  public ngAfterViewInit(): void {
    if (this.type === TipoSlider.Fixed) this.aplicarConfiguracionFixed();
    this.subscribeInputCambios();
    this.subscribeOutputNgcRangeModelSubject();

    this.labelValorInferior = this.obtenerLabelDeslizableActivo(this.valor);
    this.labelValorSuperior = this.obtenerLabelDeslizableActivo(this.valorSuperior);

    this.calcularDimensiones();
    this.actualizarDeslizables();
    this.bindearEventos();
    this.componenteInicializado = true;
    this.changeDetectionRef.detectChanges();
  }

  /** Reajusta el slider a las nuevas medidas de pantalla */
  @HostListener('window:resize', ['$event'])
  public onResize(event: any): void {
    this.procesarReajustePantalla();
  }

  /** Subscribirse a los cambios en los inputs */
  private subscribeInputCambios(): void {
    this.inputNgcRangeModelSubscription = this.inputNgcRangeModelSubject
      .pipe(
        distinctUntilChanged(NgcRangeModel.compare),
        filter((modelChange: InputNgcRangeModel) => modelChange.forceChange),
        throttleTime(100, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: InputNgcRangeModel) => this.actualizarModeloDesdeInput(modelChange));
  }

  private subscribeOutputNgcRangeModelSubject(): void {
    this.outputNgcRangeModelSubscription = this.outputNgcRangeModelSubject
      .pipe(
        distinctUntilChanged(NgcRangeModel.compare),
        throttleTime(100, undefined, { leading: true, trailing: true })
      )
      .subscribe((modelChange: OutputNgcRangeModel) => this.publicarCambios(modelChange));
  }

  /** Desubscripciones eventos y subjects */
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

  private unsubscribeInputNgcRangeModelSubject(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.inputNgcRangeModelSubscription)) {
      this.inputNgcRangeModelSubscription.unsubscribe();
      this.inputNgcRangeModelSubscription = null;
    }
  }

  private unsubscribeOutputNgcRangeModelSubject(): void {
    if (!UtilsHelper.esIndefinidoONulo(this.outputNgcRangeModelSubscription)) {
      this.outputNgcRangeModelSubscription.unsubscribe();
      this.outputNgcRangeModelSubscription = null;
    }
  }

  /** Obtener el elemento deslizable segun tipo de punto */
  private obtenerDeslizableElement(tipoPunto: TipoPunto): NgcRangeDeslizableDirective {
    if (tipoPunto === TipoPunto.Min) {
      return this.deslizableInferior;
    } else if (tipoPunto === TipoPunto.Max) {
      return this.deslizableSuperior;
    }
    return null;
  }

  /** Obtiene el valor actual de la vista dependiendo del tipo de deslizable activo */
  private obtenerValorVistaActual(): number {
    if (this.tipoPuntoActivo === TipoPunto.Min) {
      return this.labelValorInferior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max) {
      return this.labelValorSuperior;
    }
    return null;
  }

  /** Obtener el valor de la vista */
  private obtenerLabelDeslizableActivo(value: number): number {
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
    this.valor = this.obtenerValorModeloSegunTipo(this.labelValorInferior);
    this.valorSuperior = this.obtenerValorModeloSegunTipo(this.labelValorSuperior);
    this.slideValores = [this.valor, this.valorSuperior];
  }

  /** Actualizar cambios al modelo a partir del input */
  private actualizarModeloDesdeInput(modelChange: InputNgcRangeModel): void {
    const valoresNormalizados: InputNgcRangeModel = this.normalizarValores(modelChange);

    if (this.type === TipoSlider.Normal) {
      if (valoresNormalizados.valor > this.labelValorSuperior) {
        valoresNormalizados.valor = this.labelValorSuperior;
      } else if (valoresNormalizados.valor < this.min) {
        valoresNormalizados.valor = this.min;
      }

      if (valoresNormalizados.valorSuperior < this.labelValorInferior) {
        valoresNormalizados.valorSuperior = this.labelValorInferior;
      } else if (valoresNormalizados.valorSuperior > this.max) {
        valoresNormalizados.valorSuperior = this.max;
      }
    }

    // If normalised model change is different, apply the change to the model values
    const normalizacionConDiferencias: boolean = !NgcRangeModel.compare(modelChange, valoresNormalizados);
    if (normalizacionConDiferencias) {
      this.valor = valoresNormalizados.valor;
      this.valorSuperior = valoresNormalizados.valorSuperior;
    }

    this.labelValorInferior = this.obtenerLabelDeslizableActivo(valoresNormalizados.valor);
    this.labelValorSuperior = this.obtenerLabelDeslizableActivo(valoresNormalizados.valorSuperior);

    this.actualizarDeslizables();

    this.outputNgcRangeModelSubject.next({
      valor: valoresNormalizados.valor,
      valorSuperior: valoresNormalizados.valorSuperior,
      forceChange: normalizacionConDiferencias,
      cambioSolicitadoUsuario: false
    });
  }

  /** Publica los cambios en el modelo con los callbacks NgModel y outputs */
  private publicarCambios(modelChange: OutputNgcRangeModel): void {
    const emitOutputs: () => void = (): void => {
      this.valueChange.emit(modelChange.valor);
      this.valorSuperiorChange.emit(modelChange.valorSuperior);
      this.rangeChange.emit(this.slideValores);
    };

    if (!UtilsHelper.esIndefinidoONulo(this.onChangeCallback)) {
      this.onChangeCallback([modelChange.valor, modelChange.valorSuperior]);
    }
    if (!UtilsHelper.esIndefinidoONulo(this.onTouchedCallback)) {
      this.onTouchedCallback([modelChange.valor, modelChange.valorSuperior]);
    }

    if (modelChange.cambioSolicitadoUsuario) {
      emitOutputs();
    } else {
      setTimeout(() => {
        emitOutputs();
      });
    }
  }

  /** Normalizar valores de los nuevos cambios */
  private normalizarValores(valores: InputNgcRangeModel): InputNgcRangeModel {
    const inputNormalizado: InputNgcRangeModel = new InputNgcRangeModel();
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
  private obtenerTodosElementosSliders(): NgcRangeElementoDirective[] {
    return [
      this.barraSlider,
      this.barraSeleccionados,
      this.deslizableInferior,
      this.deslizableSuperior,
      this.labelInferior,
      this.labelSuperior
    ];
  }

  /** Calcular dimensiones del slider */
  private calcularDimensiones(): void {
    this.deslizableInferior.calcularDimension();
    const deslizableDimension: number = this.deslizableInferior.dimension;

    this.deslizableMediaDimension = deslizableDimension / 2;
    this.barraSlider.calcularDimension();

    this.maximaPosicionDeslizable = this.barraSlider.dimension - deslizableDimension;

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
    this.actualizarDeslizableInferior(this.obtenerPosicionDelValor(this.labelValorInferior));
    this.actualizarDeslizableSuperior(this.obtenerPosicionDelValor(this.labelValorSuperior));
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
    this.deslizableInferior.actualizarPosicion(nuevaPosicion);
    this.labelInferior.setValor(this.obtenerValorLabel(this.labelValorInferior));
  }

  /** Actualiza el deslizable superior y su valor mostrado */
  private actualizarDeslizableSuperior(nuevaPosicion: number): void {
    this.deslizableSuperior.actualizarPosicion(nuevaPosicion);
    this.labelSuperior.setValor(this.obtenerValorLabel(this.labelValorSuperior));
  }

  /** Actualiza el ancho y la posicion de la barra entre los dos puntos seleccionados. */
  private actualizarBarraSelecionados(): void {
    const posicionRangoSeleccionado: number =
      this.deslizableInferior.position + this.deslizableMediaDimension;
    let dimension = Math.abs(this.deslizableSuperior.position - this.deslizableInferior.position);
    let posicion = posicionRangoSeleccionado;
    this.barraSeleccionados.aplicarDimension(dimension);
    this.barraSeleccionados.actualizarPosicion(posicion);
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
    let diferenciaNodo: number = UtilsHelper.redondear(value - this.limiteInferior, this.cantidadDecimales);

    diferenciaNodo = Math.round(diferenciaNodo);
    return UtilsHelper.redondear(this.limiteInferior + diferenciaNodo, this.cantidadDecimales);
  }

  /** Obtiene la posicion a partir del valor */
  private obtenerPosicionDelValor(valor: number): number {
    let porcentaje: number = UtilsHelper.obtenerPorcentajePosicion(
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
    const value: number = UtilsHelper.obtenerPosicionPorcentaje(
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
    return posicionEvento - this.deslizableMediaDimension;
  }

  /** Obtener el deslizable mas cercano a la posicion */
  private obtenerDeslizableMasCercano(event: MouseEvent): TipoPunto {
    const posicion: number = this.obtenerPosicionDelEvento(event);
    const distanciaMinima: number = Math.abs(posicion - this.deslizableInferior.position);
    const distanciaMaxima: number = Math.abs(posicion - this.deslizableSuperior.position);

    if (distanciaMinima < distanciaMaxima) {
      return TipoPunto.Min;
    } else if (distanciaMinima > distanciaMaxima) {
      return TipoPunto.Max;
    }
    return posicion < this.deslizableInferior.position ? TipoPunto.Min : TipoPunto.Max;
  }

  /** Activar los eventos en cada uno de los elementos del slider */
  private bindearEventos(): void {
    const simularMovimiento = true;
    this.barraSeleccionados.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(null, event, true, true, simularMovimiento)
    );

    this.barraSlider.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(null, event, true, true, simularMovimiento)
    );

    this.deslizableInferior.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(TipoPunto.Min, event, true, true)
    );

    this.deslizableSuperior.activarEvento('mousedown', (event: MouseEvent): void =>
      this.onStartEvent(TipoPunto.Max, event, true, true)
    );

    if (this.type === TipoSlider.Normal) {
      this.valorElement.activarEvento('blur', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Min)
      );

      this.valorElement.activarEvento('keyup.enter', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Min)
      );

      this.valorSuperiorElement.activarEvento('blur', (event): void =>
        this.setNuevoValor(event.target.value, TipoPunto.Max)
      );

      this.valorSuperiorElement.activarEvento('keyup.enter', (event): void =>
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

      this.inputNgcRangeModelSubject.next({
        valor: this.valor,
        valorSuperior: this.valorSuperior,
        forceChange: true,
        cambioInterno: true
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
        cambioInterno: true
      };
      this.valorEditable = false;
    } else {
      nuevoValorInput = {
        valor: this.valor,
        valorSuperior: nuevoValor,
        forceChange: true,
        cambioInterno: true
      };
      this.valorSuperiorEditable = false;
    }

    this.inputNgcRangeModelSubject.next(nuevoValorInput);
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

    const deslizableElement: NgcRangeDeslizableDirective = this.obtenerDeslizableElement(tipoPunto);
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

    this.inputNgcRangeModelSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      forceChange: false,
      cambioInterno: true
    });

    this.outputNgcRangeModelSubject.next({
      valor: this.valor,
      valorSuperior: this.valorSuperior,
      cambioSolicitadoUsuario: true,
      forceChange: false
    });
  }

  // Set the new value and position to the current tracking handle
  private actualizarPosicionDeslizable(nuevoValor: number): void {
    if (this.tipoPuntoActivo === TipoPunto.Min && nuevoValor > this.labelValorSuperior) {
      nuevoValor = this.labelValorSuperior;
    } else if (this.tipoPuntoActivo === TipoPunto.Max && nuevoValor < this.labelValorInferior) {
      nuevoValor = this.labelValorInferior;
    }

    if (this.obtenerValorVistaActual() !== nuevoValor) {
      if (this.tipoPuntoActivo === TipoPunto.Min) {
        this.labelValorInferior = nuevoValor;
        this.actualizarModelo();
      } else if (this.tipoPuntoActivo === TipoPunto.Max) {
        this.labelValorSuperior = nuevoValor;
        this.actualizarModelo();
      }
      this.actualizarDeslizablesPorTipo(this.tipoPuntoActivo, this.obtenerPosicionDelValor(nuevoValor));
    }
  }

  public ngOnDestroy(): void {
    this.desbindearEventos();
    this.unsubscribeOutputNgcRangeModelSubject();
    this.unsubscribeInputNgcRangeModelSubject();
  }
}
