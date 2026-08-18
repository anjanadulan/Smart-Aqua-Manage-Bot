#include <Arduino.h>

#define hw038SensorPin 2

const int hw038DryValue = 0;
const int hw038TouchValue = 800;
const int hw038HalfValue = 2100;
const int hw038FullValue = 2150;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- HW-038 Water Level Sensor Test ---");
  pinMode(hw038SensorPin, INPUT);
  analogSetPinAttenuation(hw038SensorPin, ADC_11db);
}

float hw038PercentageFromRaw(int rawValue) {
  float percentage = 0.0f;
  if (rawValue <= hw038TouchValue) {
    percentage = 5.0f * (rawValue - hw038DryValue) / static_cast<float>(hw038TouchValue - hw038DryValue);
  } else if (rawValue <= hw038HalfValue) {
    percentage = 5.0f + 45.0f * (rawValue - hw038TouchValue) / static_cast<float>(hw038HalfValue - hw038TouchValue);
  } else {
    percentage = 50.0f + 50.0f * (rawValue - hw038HalfValue) / static_cast<float>(hw038FullValue - hw038HalfValue);
  }
  return constrain(percentage, 0.0f, 100.0f);
}

const char* hw038LevelName(int percentage) {
  if (percentage <= 0) return "CRITICAL";
  if (percentage <= 20) return "LOW";
  if (percentage <= 50) return "MEDIUM";
  return "BEST";
}

void loop() {
  unsigned long rawSum = 0;
  for (int i = 0; i < 10; i++) {
    rawSum += analogRead(hw038SensorPin);
    delay(2);
  }
  int rawValue = rawSum / 10;
  int percentage = static_cast<int>(hw038PercentageFromRaw(rawValue) + 0.5f);
  const char* level = hw038LevelName(percentage);

  Serial.printf("Raw ADC: %d | Water Depth: %d%% | Level: %s\n", rawValue, percentage, level);
  delay(2000);
}
