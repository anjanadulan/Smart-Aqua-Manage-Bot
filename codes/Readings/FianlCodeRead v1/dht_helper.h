#pragma once
#include <DHT.h>

#define DHTPIN 16
#define DHTTYPE DHT22   // DHT 22 (AM2302), AM2321

DHT dht(DHTPIN, DHTTYPE);

// Added the missing helper logic used by readAndUploadDht
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

void readDht() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  float f = dht.readTemperature(true);

  if (isnan(h) || isnan(t) || isnan(f)) {
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  float hif = dht.computeHeatIndex(f, h);
  float hic = dht.computeHeatIndex(t, h, false);

  Serial.print(F("Humidity: "));
  Serial.print(h);
  Serial.print(F("%  Temperature: "));
  Serial.print(t);
  Serial.print(F("°C "));
  Serial.print(f);
  Serial.print(F("°F  Heat index: "));
  Serial.print(hic);
  Serial.print(F("°C "));
  Serial.print(hif);
  Serial.println(F("°F"));
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
