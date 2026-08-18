#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// ---------- WiFi credentials ----------
#define WIFI_SSID "Prem Fiber"
#define WIFI_PASSWORD "@welcome123"

// ---------- Firebase credentials ----------
#define FIREBASE_HOST "aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app"
#define API_KEY "AIzaSyBLwrJHK-rU4AL8OtXM3XTrbm8JSmhtSKo"
#define USER_EMAIL "espcam@gmail.com"
#define USER_PASSWORD "live@1223"

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

const String basePath = "/devices/aqua-main/status";

// Pin definitions
#define feedPin            D1   // feederActive
#define filterPin          D2   // filtrationRelay
#define uvPin              D5   // uvRelay
#define glassCleanerPin    D6   // glassCleanerActive
#define limitSwitchPin     D7   // glasscleaner is stop detection

// Database reading timer
unsigned long lastReadTime = 0;
const unsigned long readInterval = 2000;

unsigned long feederStartTime = 0;
const unsigned long feederRunDuration = 5000;
bool feederIsRunning = false;

enum CleanerState { IDLE, PULSING, RUNNING };
CleanerState cleanerState = IDLE;
unsigned long pulseStartTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(feedPin, OUTPUT);
  pinMode(filterPin, OUTPUT);
  pinMode(uvPin, OUTPUT);
  
  // for CNC Shield 
  pinMode(glassCleanerPin, OUTPUT);
  digitalWrite(glassCleanerPin, HIGH); // Default state for CNC Resume pin is HIGH
  pinMode(limitSwitchPin, INPUT_PULLUP); // Keeps pin HIGH until CNC pulls it LOW

  // default pin setup
  digitalWrite(feedPin, LOW);
  digitalWrite(filterPin, LOW);
  digitalWrite(uvPin, LOW);
  
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
}

void loop() {
  unsigned long currentMillis = millis();

  if (feederIsRunning && (currentMillis - feederStartTime >= feederRunDuration)) {
    digitalWrite(feedPin, LOW);
    feederIsRunning = false;
    Serial.println("Feeder running time completed. Pin set to LOW.");
  }

  // cnc
  switch (cleanerState) {
    case PULSING:
      // 200ms low pulse completed
      if (currentMillis - pulseStartTime >= 200) {
        digitalWrite(glassCleanerPin, HIGH); // Return to idle HIGH
        cleanerState = RUNNING;
        Serial.println("CNC Triggered.");
      }
      break;

    case RUNNING:
      // for limitswitch detection
      if (digitalRead(limitSwitchPin) == LOW) {
        Serial.println("CNC Loop Finished!");
        
        String path = basePath + "/glassCleanerActive";
        if (Firebase.setBool(firebaseData, path, false)) { 
          Serial.println("Glass cleaner status auto-reset to false in Firebase.");
        } else {
          Serial.println("Glass cleaner Firebase reset FAILED: " + firebaseData.errorReason());
        }
        cleanerState = IDLE;
      }
      break;

    case IDLE:
    default:
      break;
  }

  // readings
  if (currentMillis - lastReadTime >= readInterval) {
    lastReadTime = currentMillis;
    
    Serial.println("----- Checking Database Updates -----");

    if (readBool("filtrationRelay")) {
      digitalWrite(filterPin, HIGH);
    } else {
      digitalWrite(filterPin, LOW);
    }

    if (readBool("uvRelay")) {
      digitalWrite(uvPin, HIGH);
    } else {
      digitalWrite(uvPin, LOW);
    }

    if (readBool("glassCleanerActive")) {
      if (cleanerState == IDLE) {
        Serial.println("Glass cleaner Activating...");
        digitalWrite(glassCleanerPin, LOW);
        pulseStartTime = currentMillis;
        cleanerState = PULSING;
      }
    }

    if (readBool("feederActive")) {
      //check not running
      if (!feederIsRunning) {
        digitalWrite(feedPin, HIGH);
        feederStartTime = currentMillis;
        feederIsRunning = true;
        Serial.println("Feeder triggered! Timer started for 5 seconds.");
        //reset firebase for prevent loops
        String path = basePath + "/feederActive";
        if (Firebase.setBool(firebaseData, path, false)) { 
          Serial.println("Feeder status auto-reset to false in Firebase.");
        } else {
          Serial.println("Feeder Firebase reset FAILED: " + firebaseData.errorReason());
        }
      }
    }
    
    Serial.println("-------------------------------------");
  }
}

bool readBool(const String &field) {
  String path = basePath + "/" + field;
  if (Firebase.getBool(firebaseData, path)) {
    Serial.println(field + ": " + String(firebaseData.boolData() ? "true" : "false"));
    return firebaseData.boolData(); 
  } else {
    Serial.println(field + " -> ERROR: " + firebaseData.errorReason());
    return false; 
  }
}
