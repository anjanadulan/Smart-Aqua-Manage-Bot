#include <Arduino.h>

#define TDS_PIN 1

void setup() {
  Serial.begin(115200);
  analogSetAttenuation(ADC_11db);
}

void loop() {
  float voltage = (analogRead(TDS_PIN) * 3.3) / 4096.0;

  float ppm = (133.42 * voltage * voltage * voltage 
            - 255.86 * voltage * voltage 
            + 857.39 * voltage) * 0.5;

  if (ppm < 0) ppm = 0;

  Serial.print("V: ");
  Serial.print(voltage, 2);
  Serial.print("V , TDS: ");
  Serial.print(ppm, 0);
  Serial.println(" ppm");


  delay(2000);
}
