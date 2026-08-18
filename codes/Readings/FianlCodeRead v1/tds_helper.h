#pragma once
#include <Arduino.h>

#define TDS_PIN 1

static String lastUploadedTdsStatus = "";

void setupTds() {
  analogSetAttenuation(ADC_11db);
  pinMode(TDS_PIN, INPUT);
}

void getTdsReading(float &currentTds, String &waterQualityStatusOut, float &voltageOut) {
  float voltage = (analogRead(TDS_PIN) * 3.3) / 4096.0;
  voltageOut = voltage;

  float ppm = (133.42 * voltage * voltage * voltage 
            - 255.86 * voltage * voltage 
            + 857.39 * voltage) * 0.5;

  if (ppm < 0) ppm = 0;
  currentTds = ppm;

  if (ppm == 0) {
    waterQualityStatusOut = "Unknown";
  } else if (ppm < 100) {
    waterQualityStatusOut = "Good";
  } else if (ppm < 250) {
    waterQualityStatusOut = "Fair";
  } else {
    waterQualityStatusOut = "Poor";
  }
}

void readTds() {
  float currentTds = 0.0f;
  float voltage = 0.0f;
  String waterQualityStatusOut = "";
  getTdsReading(currentTds, waterQualityStatusOut, voltage);

  Serial.print("V: ");
  Serial.print(voltage, 2);
  Serial.print("V , TDS: ");
  Serial.print(currentTds, 0);
  Serial.println(" ppm");
  Serial.print("Water Status: ");
  Serial.println(waterQualityStatusOut);

  delay(500);
}

void readAndUploadTds(FirebaseData &fbdoRef, float &lastUploadedTdsRef) {
  float currentTds = 0.0f;
  float voltage = 0.0f;
  String currentTdsStatus = "";
  getTdsReading(currentTds, currentTdsStatus, voltage);

  if (currentTds != lastUploadedTdsRef || currentTdsStatus != lastUploadedTdsStatus) {
    if (Firebase.RTDB.setInt(&fbdoRef, "/devices/aqua-main/status/tdsPpm", (int)currentTds)) {
      Firebase.RTDB.setString(&fbdoRef, "/devices/aqua-main/status/waterSt", currentTdsStatus);
      Firebase.RTDB.setString(&fbdoRef, "/devices/aqua-main/status/waterQuality", currentTdsStatus);
      lastUploadedTdsRef = currentTds;
      lastUploadedTdsStatus = currentTdsStatus;
      Serial.println("Uploaded TDS data to Firebase");
    } else {
      Serial.printf("Failed to upload TDS data: %s\n", fbdoRef.errorReason().c_str());
    }
  }
}

