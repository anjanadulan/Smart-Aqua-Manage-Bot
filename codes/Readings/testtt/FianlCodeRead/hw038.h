#pragma once
#include <Arduino.h>
#include <Firebase_ESP_Client.h>

#define HW038_PIN 4 

const int lowerThreshold = 200; 
const int midThreshold = 420; 
const int upperThreshold = 520; 

void setupHw038() {
  pinMode(HW038_PIN, INPUT);
  analogSetAttenuation(ADC_11db);
}

String getHw038WaterLevel(int &rawLevelOut) {
  long adcSum = 0;
  for (int i = 0; i < 10; i++) {
    adcSum += analogRead(HW038_PIN);
    delay(2);
  }
  rawLevelOut = adcSum / 10;

  if (rawLevelOut > upperThreshold) {
    return "BEST";
  } else if (rawLevelOut > midThreshold) {
    return "MEDIUM";
  } else if (rawLevelOut > lowerThreshold) {
    return "LOW";
  } else {
    return "CRITICAL";
  }
}

void readAndUploadHw038(FirebaseData &fbdoRef, String &lastUploadedWaterLevelRef) {
  int level = 0;
  String currentWaterLevel = getHw038WaterLevel(level);

  if (currentWaterLevel != lastUploadedWaterLevelRef) {
    if (Firebase.RTDB.setString(&fbdoRef, "/devices/aqua-main/status/waterLevel", currentWaterLevel)) {
      lastUploadedWaterLevelRef = currentWaterLevel;
      Serial.print("Uploaded Water Level data to Firebase: ");
      Serial.println(currentWaterLevel);
    } else {
      Serial.printf("Failed to upload Water Level data: %s\n", fbdoRef.errorReason().c_str());
    }
  }
}