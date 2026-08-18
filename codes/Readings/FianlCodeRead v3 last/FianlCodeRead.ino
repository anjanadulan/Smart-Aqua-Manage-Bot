#include <WiFi.h>
#include <Arduino.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "secrets.h"

#include "dht_helper.h"
#include "tds_helper.h"
#include "hw038.h"

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Upload rate control
unsigned long lastFirebaseUploadMillis = 0;
const unsigned long firebaseUploadIntervalMs = 5000UL;

float lastUploadedTempC = -999.0f;
float lastUploadedTdsRef = -1.0f;
String lastUploadedWaterLevel = "";

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("Initializing Aqua Smart Readings Node (ESP32)...");

  // Temporarily lower CPU clock to 80MHz to reduce peak power draw during boot
  setCpuFrequencyMhz(80); 

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WiFi_SSID, WiFi_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi with IP: " + WiFi.localIP().toString());

  // Restore high performance (240MHz)
  setCpuFrequencyMhz(240);  

  // Connect to Firebase
  Serial.println("Connecting to Firebase Realtime Database...");
  config.api_key = Firebase_API_KEY;
  auth.user.email = Firebase_Device_mail;  
  auth.user.password = Firebase_Device_pw; 
  config.database_url = Firebase_DB_url; 

  config.timeout.socketConnection = 10 * 1000;
  config.timeout.sslHandshake = 10 * 1000;

  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true); 

  fbdo.setResponseSize(2048);

  Serial.println("Connected to Firebase Realtime Database");

  // Required by the DB validate rule (hasChildren(['online','waterLevel','waterQuality']))
  if (!Firebase.RTDB.setBool(&fbdo, "/devices/aqua-main/status/online", true)) {
    Serial.printf("Failed to set online flag: %s\n", fbdo.errorReason().c_str());
  }

  // Initialize sensors
  setupDht();
  setupTds();
  setupHw038();

  // Seed waterLevel + waterQuality once at boot so the DB's hasChildren
  // validate rule is satisfied immediately, regardless of loop order
  readAndUploadTds(fbdo, lastUploadedTdsRef);
  readAndUploadHw038(fbdo, lastUploadedWaterLevel);
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastFirebaseUploadMillis >= firebaseUploadIntervalMs) {
    lastFirebaseUploadMillis = currentMillis;

    if (Firebase.ready()) {
      // Call helper functions to read and upload
      readAndUploadDht(fbdo, lastUploadedTempC);
      readAndUploadTds(fbdo, lastUploadedTdsRef);
      readAndUploadHw038(fbdo, lastUploadedWaterLevel);
    }
  }
}
