#pragma once
#include <DHT.h>

#define DHTPIN 16
#define DHTTYPE DHT22   // DHT 22

DHT dht(DHTPIN, DHTTYPE);


bool measureDht22(float &tempC) {
  float t = dht.readTemperature();
  if (isnan(t)) {
    return false;
  }
  tempC = t;
  return true;
}

void setupDht() {
  dht.begin();
}

void readAndUploadDht(FirebaseData &fbdoRef, float &lastUploadedTempRef) {
  float tempC = 0.0f;
  
  if (measureDht22(tempC)) {
    Serial.printf("DHT22 Read -> Temp: %.1f °C\n", tempC); 

    if (tempC != lastUploadedTempRef) {
      if (Firebase.RTDB.setFloat(&fbdoRef, "/devices/aqua-main/status/temperatureC", tempC)) {
        lastUploadedTempRef = tempC;
        Serial.println("Temperature uploaded successfully");
      } else {
        Serial.printf("Failed to upload temperature: %s\n", fbdoRef.errorReason().c_str());
      }
    }
  } else {
    Serial.println("Sensor reading failed, skipping Firebase upload"); 
  }
}
