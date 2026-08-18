#pragma once
#include <Arduino.h>
#include <Firebase_ESP_Client.h>

#define TDS_PIN 1

static String lastUploadedTdsStatus = "";
static String lastUploadedWaterQuality = "";

void setupTds() {
  analogSetAttenuation(ADC_11db);
  pinMode(TDS_PIN, INPUT);
}

// waterQualityStatusOut: 6-tier display value used by the app UI (not enforced by DB rules)
// waterQualityOut: 3-tier value required by the DB validate rule (GOOD | AVERAGE | BAD only)
void getTdsReading(float &currentTds, String &waterQualityStatusOut, String &waterQualityOut, float &voltageOut) {
  float voltage = (analogRead(TDS_PIN) * 3.3) / 4096.0;
  voltageOut = voltage;

  float ppm = (133.42 * voltage * voltage * voltage 
            - 255.86 * voltage * voltage 
            + 857.39 * voltage) * 0.5;

  if (ppm < 0) ppm = 0;
  currentTds = ppm;

  if (ppm <= 0) {
    waterQualityStatusOut = "Unknown";
  } else if (ppm < 50) {
    waterQualityStatusOut = "BEST";
  } else if (ppm < 150) {
    waterQualityStatusOut = "GOOD";
  } else if (ppm < 300) {
    waterQualityStatusOut = "AVERAGE";
  } else if (ppm < 500) {
    waterQualityStatusOut = "POOR";
  } else if (ppm < 800) {
    waterQualityStatusOut = "BAD";
  } else {
    waterQualityStatusOut = "CRITICAL";
  }

}

void readAndUploadTds(FirebaseData &fbdoRef, float &lastUploadedTdsRef) {
  float currentTds = 0.0f;
  float voltage = 0.0f;
  String currentTdsStatus = "";
  String currentWaterQuality = "";
  getTdsReading(currentTds, currentTdsStatus, currentWaterQuality, voltage);

  if (currentTds != lastUploadedTdsRef || currentTdsStatus != lastUploadedTdsStatus) {
    FirebaseJson json;
    json.set("tdsPpm", (int)currentTds);
    json.set("waterSt", currentTdsStatus);
    json.set("waterQuality", currentWaterQuality);

    if (Firebase.RTDB.updateNode(&fbdoRef, "/devices/aqua-main/status", &json)) {
      lastUploadedTdsRef = currentTds;
      lastUploadedTdsStatus = currentTdsStatus;
      lastUploadedWaterQuality = currentWaterQuality;
      Serial.println("Uploaded TDS data to Firebase");
    } else {
      Serial.printf("Failed to upload TDS data: %s\n", fbdoRef.errorReason().c_str());
    }
  }
}

