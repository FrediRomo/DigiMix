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

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);

  Serial.begin(115200);
  Serial.println("Control PID para motor con ESP32");
  Serial.println("Escribe un nuevo valor de referencia (0-255):");
}

void loop() {
  // Leer el tiempo actual
  unsigned long tiempoActual = millis();

  // Leer valor del potenciómetro y mapearlo a rango 0-255
  int valorPot = analogRead(POT_PIN) / 16;

  // Comprobar si hay datos disponibles en la terminal
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n'); // Leer hasta el salto de línea
    int nuevoValor = input.toInt();  // Convertir a entero

    // Validar el nuevo valor de referencia
    if (nuevoValor >= 0 && nuevoValor <= 100) {
      referencia = nuevoValor * 2.55;  // Actualizar la referencia
      Serial.print("Referencia actualizada a: ");
      Serial.println(referencia);
    } else {
      Serial.println("Por favor, ingresa un valor entre 0 y 100.");
    }
  }

  // Controlar el cálculo del PID a intervalos regulares
  if (tiempoActual - tiempoAnterior >= intervaloPID) {
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
