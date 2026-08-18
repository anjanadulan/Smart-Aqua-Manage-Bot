#include <Arduino.h>

#define filterRelayPin 5
#define uvRelayPin 6
#define feederRelayPin 7

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- Relay & Feeder Test ---");

  pinMode(filterRelayPin, OUTPUT);
  pinMode(uvRelayPin, OUTPUT);
  pinMode(feederRelayPin, OUTPUT);

  digitalWrite(filterRelayPin, LOW);
  digitalWrite(uvRelayPin, LOW);
  digitalWrite(feederRelayPin, LOW);
}

void loop() {
  Serial.println("Toggling Filtration Relay ON (GPIO 5)...");
  digitalWrite(filterRelayPin, HIGH);
  delay(3000);
  digitalWrite(filterRelayPin, LOW);
  delay(1000);

  Serial.println("Toggling UV Relay ON (GPIO 6)...");
  digitalWrite(uvRelayPin, HIGH);
  delay(3000);
  digitalWrite(uvRelayPin, LOW);
  delay(1000);

  Serial.println("Toggling Feeder Relay ON (GPIO 7) for 5 seconds...");
  digitalWrite(feederRelayPin, HIGH);
  delay(5000);
  digitalWrite(feederRelayPin, LOW);
  delay(3000);
}
