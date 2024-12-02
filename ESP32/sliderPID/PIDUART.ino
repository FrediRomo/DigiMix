#include <HardwareSerial.h>

// Pines del puente H
const int IN1 = 18;
const int IN2 = 19;
const int ENA = 5;  // PWM para control de velocidad

// Pin del potenciómetro
const int POT_PIN = 34;  // Entrada analógica (ADC)

// Variables del PID
float kp = 0.5;    // Ganancia proporcional
float ki = 0.018;  // Ganancia integral (más pequeña)
float kd = 0.15;   // Ganancia derivativa

float errorAnterior = 0;
float integral = 0;

// Valor de referencia (posición deseada del potenciómetro)
float referencia = 0.0;  // Ajusta según necesidad

// Umbral para evitar oscilaciones
const int UMBRAL_ERROR = 2;

// Variables de tiempo
unsigned long tiempoAnterior = 0;
const unsigned long intervaloPID = 5;  // Intervalo en milisegundos para el cálculo del PID
unsigned long tiempoInicioReferencia = 0;
const unsigned long tiempoPIDActivo = 3000;  // Tiempo en milisegundos para activar el PID (3 segundos)

// Estado del PID
bool pidActivo = false;

// Variables para detección de cambios
int ultimoValorPot = 0;  // Último valor leído del potenciómetro
const float UMBRAL_CAMBIO = 0.03;  // Umbral del 3% para activar la interrupción

// Configuración de UART 2
HardwareSerial UART2(2);

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);

  // Configuración de UART 2
  UART2.begin(115200, SERIAL_8N1, 16, 17);  // Pines TX=16, RX=17

  Serial.begin(115200);
  Serial.println("Control PID para motor con ESP32");
  Serial.println("Escribe un nuevo valor de referencia (0-100):");
}

void loop() {
  // Leer el tiempo actual
  unsigned long tiempoActual = millis();

  // Leer valor del potenciómetro y mapearlo a rango 0-255
  int valorPot = analogRead(POT_PIN) / 16;

  // Detectar cambio significativo mientras el PID está desactivado
  if (!pidActivo && abs(valorPot - ultimoValorPot) > UMBRAL_CAMBIO * 255) {
    // Actualizar último valor leído
    ultimoValorPot = valorPot;

    // Activar interrupción simulada y enviar valor por UART2
    enviarPotenciometroUART(valorPot);
  }

  // Comprobar si hay datos disponibles en la terminal UART0 (Arduino)
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n'); // Leer hasta el salto de línea
    procesarNuevaReferencia(input);
  }

  // Comprobar si hay datos disponibles en UART2
  if (UART2.available() > 0) {
    String inputUART2 = UART2.readStringUntil('\n'); // Leer hasta el salto de línea
    procesarNuevaReferencia(inputUART2);
  }

  // Desactivar el PID si han pasado más de 3 segundos
  if (pidActivo && (tiempoActual - tiempoInicioReferencia > tiempoPIDActivo)) {
    pidActivo = false;
    detener();  // Detener el motor
    Serial.println("Control PID desactivado por tiempo.");
  }

  // Ejecutar el control PID solo si está activo
  if (pidActivo && (tiempoActual - tiempoAnterior >= intervaloPID)) {
    tiempoAnterior = tiempoActual;

    // Calcular error
    float error = referencia - valorPot;

    // Si el error es mayor que el umbral, acumular la parte integral
    if (abs(error) > UMBRAL_ERROR) {
      integral += error;
    } else {
      integral = 0;  // Evitar acumulación innecesaria
    }

    // Calcular la parte derivativa
    float derivativo = error - errorAnterior;

    // Calcular salida del PID
    float salidaPID = kp * error + ki * integral + kd * derivativo;

    // Limitar salida a 0-255
    salidaPID = constrain(abs(salidaPID), 0, 255);

    // Controlar dirección y velocidad del motor
    if (abs(error) <= UMBRAL_ERROR) {
      detener();  // Detener el motor si está cerca de la referencia
    } else if (error > 0) {
      adelante(salidaPID);  // Mover hacia adelante si la referencia es mayor
    } else {
      atras(salidaPID);  // Mover hacia atrás si el valor es mayor que la referencia
    }

    // Actualizar error anterior
    errorAnterior = error;

    // Mostrar información en la terminal
    Serial.print("Ref: ");
    Serial.print(referencia);
    Serial.print(" | Pot: ");
    Serial.print(valorPot);
    Serial.print(" | Error: ");
    Serial.print(error);
    Serial.print(" | PID: ");
    Serial.println(salidaPID);
  }
}

// Función para mover el motor hacia adelante con PWM
void adelante(int velocidad) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, velocidad);  // PWM para velocidad
}

// Función para mover el motor hacia atrás con PWM
void atras(int velocidad) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  analogWrite(ENA, velocidad);  // PWM para velocidad
}

// Función para detener el motor
void detener() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0);  // Detener motor
}

// Función para enviar el valor del potenciómetro por UART2
void enviarPotenciometroUART(int valorPot) {
  UART2.print("Cambio detectado: ");
  UART2.println(valorPot);
}

// Función para procesar nuevas referencias desde cualquier fuente
void procesarNuevaReferencia(String input) {
  int nuevoValor = input.toInt();  // Convertir a entero

  // Validar el nuevo valor de referencia
  if (nuevoValor >= 0 && nuevoValor <= 100) {
    referencia = nuevoValor * 2.55;  // Actualizar la referencia
    Serial.print("Referencia actualizada a: ");
    Serial.println(referencia);

    // Reiniciar el temporizador y activar el PID
    tiempoInicioReferencia = millis();
    pidActivo = true;
  } else {
    Serial.println("Por favor, ingresa un valor entre 0 y 100.");
  }
}

