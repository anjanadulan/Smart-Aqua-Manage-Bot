#include <WiFi.h>
#include <FirebaseESP32.h>
#include "DHT.h"

// ---------- WiFi credentials ----------
#define WIFI_SSID "Prem Fiber"
#define WIFI_PASSWORD "@welcome123"

// ---------- Firebase credentials ----------
#define FIREBASE_HOST "aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app"
#define API_KEY "AIzaSyBLwrJHK-rU4AL8OtXM3XTrbm8JSmhtSKo"
#define USER_EMAIL "webadmin@gmail.com" 
#define USER_PASSWORD "admin@1223"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const String basePath = "/devices/aqua-main/status";

// ---------- DHT22 ----------
#define DHTPIN 16
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ---------- HW-038 water level ----------
#define hw038SensorPin 2
const int hw038DryValue = 0;
const int hw038TouchValue = 800;
const int hw038HalfValue = 2100;
const int hw038FullValue = 2150;

// ---------- TDS sensor ----------
#define TDS_PIN 1

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000; // push every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);

  dht.begin();
  pinMode(hw038SensorPin, INPUT);
  analogSetPinAttenuation(hw038SensorPin, ADC_11db);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  config.host = FIREBASE_HOST;
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Waiting for Firebase authentication...");
  while (auth.token.uid == "") {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nAuthenticated. UID: " + String(auth.token.uid.c_str()));
  Serial.println("--> Make sure this UID is added under deviceUsers/aqua-main in your DB!");
}

void loop() {
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    updateSensorsAndStatus();
  }
}

// ---------------- DHT22 ----------------
bool readDHT(float &temperatureC) {
  float t = dht.readTemperature();
  if (isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return false;
  }
  temperatureC = t;
  return true;
}

// ---------------- HW-038 water level ----------------
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

int readWaterLevelPercentage() {
  unsigned long rawSum = 0;
  for (int i = 0; i < 10; i++) {
    rawSum += analogRead(hw038SensorPin);
    delay(2);
  }
  int rawValue = rawSum / 10;
  return static_cast<int>(hw038PercentageFromRaw(rawValue) + 0.5f);
}

// ---------------- TDS sensor ----------------
float readTdsPpm() {
  float voltage = (analogRead(TDS_PIN) * 3.3) / 4096.0;
  float ppm = (133.42 * voltage * voltage * voltage
              - 255.86 * voltage * voltage
              + 857.39 * voltage) * 0.5;
  if (ppm < 0) ppm = 0;
  return ppm;
}

// Maps TDS ppm -> your DB's allowed waterQuality values (GOOD / AVERAGE / BAD)
const char* tdsToWaterQuality(float ppm) {
  if (ppm == 0) return "UNKNOWN";
  if (ppm <= 50)   return "BEST";
  if (ppm <= 150)  return "GOOD";
  if (ppm <= 300)  return "AVERAGE";
  if (ppm <= 500)  return "POOR";
  if (ppm <= 800)  return "BAD";
  return "CRITICAL";
}

// ---------------- Main update ----------------
void updateSensorsAndStatus() {
  Serial.println("----- Updating sensors & status -----");

  float temperatureC;
  bool dhtOk = readDHT(temperatureC);

  int levelPercent = readWaterLevelPercentage();
  const char* waterLevel = hw038LevelName(levelPercent);

  float tdsPpm = readTdsPpm();
  const char* waterQuality = tdsToWaterQuality(tdsPpm);

  Serial.printf("Temp: %.1f C | Level: %d%% (%s) | TDS: %.0f ppm (%s)\n",
                dhtOk ? temperatureC : -999, levelPercent, waterLevel, tdsPpm, waterQuality);

  bool ok = true;

  if (dhtOk) {
    ok &= Firebase.setFloat(fbdo, basePath + "/temperatureC", temperatureC);
    if (!ok) Serial.println("temperatureC write failed: " + fbdo.errorReason());
  }

  ok &= Firebase.setFloat(fbdo, basePath + "/tdsPpm", tdsPpm);
  if (!ok) Serial.println("tdsPpm write failed: " + fbdo.errorReason());

  ok &= Firebase.setString(fbdo, basePath + "/waterLevel", waterLevel);
  if (!ok) Serial.println("waterLevel write failed: " + fbdo.errorReason());

  ok &= Firebase.setString(fbdo, basePath + "/waterSt", waterQuality);
  if (!ok) Serial.println("waterQuality write failed: " + fbdo.errorReason());

  Serial.println(ok ? "All sensor values updated." : "Some writes failed - see above.");
  Serial.println("--------------------------------------");
}