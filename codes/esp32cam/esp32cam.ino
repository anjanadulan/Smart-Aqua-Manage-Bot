#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "esp_camera.h"
#include "esp_http_server.h"

#include <addons/TokenHelper.h>
#include "secrets.h"

// AI Thinker ESP32-CAM pin map.
#define CAMERA_PIN_PWDN 32
#define CAMERA_PIN_RESET -1
#define CAMERA_PIN_XCLK 0
#define CAMERA_PIN_SIOD 26
#define CAMERA_PIN_SIOC 27
#define CAMERA_PIN_Y9 35
#define CAMERA_PIN_Y8 34
#define CAMERA_PIN_Y7 39
#define CAMERA_PIN_Y6 36
#define CAMERA_PIN_Y5 21
#define CAMERA_PIN_Y4 19
#define CAMERA_PIN_Y3 18
#define CAMERA_PIN_Y2 5
#define CAMERA_PIN_VSYNC 25
#define CAMERA_PIN_HREF 23
#define CAMERA_PIN_PCLK 22
#define CAMERA_FLASHLIGHT_PIN 4

static const unsigned long CAMERA_HEARTBEAT_POLL_MS = 3000UL;
static const unsigned long CAMERA_HEARTBEAT_MAX_AGE_MS = 30000UL;
static const unsigned long CAMERA_SNAPSHOT_INTERVAL_MS = 1000UL;
static const unsigned long CAMERA_FLASHLIGHT_POLL_MS = 1000UL;

static const char CAMERA_HEARTBEAT_PATH[] =
    "/devices/" CAMERA_FIREBASE_DEVICE_ID "/camera/heartbeat";
static const char CAMERA_SNAPSHOT_BLOB_PATH[] =
    "/devices/" CAMERA_FIREBASE_DEVICE_ID
    "/camera/latest/blob";
static const char CAMERA_SNAPSHOT_UPDATED_PATH[] =
    "/devices/" CAMERA_FIREBASE_DEVICE_ID
    "/camera/latest/updatedAt";
static const char CAMERA_FLASHLIGHT_PATH[] =
    "/devices/" CAMERA_FIREBASE_DEVICE_ID "/camera/flashlight";

static httpd_handle_t webServer = nullptr;
static httpd_handle_t streamServer = nullptr;

static FirebaseData firebaseData;
static FirebaseAuth firebaseAuth;
static FirebaseConfig firebaseConfig;

static unsigned long lastHeartbeatPollMillis = 0;
static unsigned long lastSnapshotUploadMillis = 0;
static unsigned long lastHeartbeatChangeMillis = 0;
static unsigned long lastFlashlightPollMillis = 0;
static double lastObservedHeartbeatMillis = 0.0;
static bool heartbeatValueInitialized = false;
static bool cloudSnapshotsActive = false;
static bool flashlightEnabled = false;

static const char STREAM_CONTENT_TYPE[] =
    "multipart/x-mixed-replace;boundary=frame";
static const char STREAM_BOUNDARY[] = "\r\n--frame\r\n";
static const char STREAM_PART[] =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static const char INDEX_HTML[] PROGMEM = R"HTML(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aquify ESP32-CAM</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: #e6f7f7;
      background: #071a1d;
      font-family: system-ui, sans-serif;
    }
    main {
      width: min(92vw, 760px);
      text-align: center;
    }
    img {
      width: 100%;
      border: 1px solid #275d63;
      border-radius: 14px;
      background: #02090a;
    }
    a { color: #6ee7db; }
  </style>
</head>
<body>
  <main>
    <h1>Aquify camera</h1>
    <img id="camera" alt="Live aquarium camera stream">
    <p><a href="/capture">Open a still image</a></p>
  </main>
  <script>
    document.getElementById("camera").src =
      "http://" + location.hostname + ":81/stream";
  </script>
</body>
</html>
)HTML";

static void addCorsHeaders(httpd_req_t *request) {
  httpd_resp_set_hdr(request, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(request, "Cache-Control", "no-store");
}

static esp_err_t indexHandler(httpd_req_t *request) {
  httpd_resp_set_type(request, "text/html");
  return httpd_resp_send(request, INDEX_HTML, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t healthHandler(httpd_req_t *request) {
  char response[160];
  String ipAddress = WiFi.localIP().toString();

  snprintf(
      response,
      sizeof(response),
      "{\"online\":true,\"ip\":\"%s\",\"uptimeMs\":%lu,\"freeHeap\":%u}",
      ipAddress.c_str(),
      millis(),
      ESP.getFreeHeap());

  addCorsHeaders(request);
  httpd_resp_set_type(request, "application/json");
  return httpd_resp_sendstr(request, response);
}

static esp_err_t captureHandler(httpd_req_t *request) {
  camera_fb_t *frame = esp_camera_fb_get();
  if (frame == nullptr) {
    Serial.println("Camera capture failed");
    httpd_resp_send_500(request);
    return ESP_FAIL;
  }

  addCorsHeaders(request);
  httpd_resp_set_type(request, "image/jpeg");
  httpd_resp_set_hdr(
      request, "Content-Disposition", "inline; filename=aquify-camera.jpg");

  esp_err_t result = httpd_resp_send(
      request,
      reinterpret_cast<const char *>(frame->buf),
      frame->len);

  esp_camera_fb_return(frame);
  return result;
}

static esp_err_t streamHandler(httpd_req_t *request) {
  esp_err_t result = httpd_resp_set_type(request, STREAM_CONTENT_TYPE);
  if (result != ESP_OK) {
    return result;
  }

  addCorsHeaders(request);

  while (true) {
    camera_fb_t *frame = esp_camera_fb_get();
    if (frame == nullptr) {
      Serial.println("Camera stream capture failed");
      return ESP_FAIL;
    }

    char partHeader[72];
    size_t headerLength = snprintf(
        partHeader,
        sizeof(partHeader),
        STREAM_PART,
        static_cast<unsigned int>(frame->len));

    result = httpd_resp_send_chunk(
        request, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (result == ESP_OK) {
      result = httpd_resp_send_chunk(request, partHeader, headerLength);
    }
    if (result == ESP_OK) {
      result = httpd_resp_send_chunk(
          request,
          reinterpret_cast<const char *>(frame->buf),
          frame->len);
    }

    esp_camera_fb_return(frame);

    if (result != ESP_OK) {
      break;
    }
  }

  return result;
}

static bool registerHandler(
    httpd_handle_t server,
    const char *uri,
    esp_err_t (*handler)(httpd_req_t *)) {
  httpd_uri_t route = {};
  route.uri = uri;
  route.method = HTTP_GET;
  route.handler = handler;
  route.user_ctx = nullptr;
  return httpd_register_uri_handler(server, &route) == ESP_OK;
}

static bool startCameraServers() {
  httpd_config_t webConfig = HTTPD_DEFAULT_CONFIG();
  webConfig.server_port = 80;

  if (httpd_start(&webServer, &webConfig) != ESP_OK) {
    return false;
  }

  if (!registerHandler(webServer, "/", indexHandler) ||
      !registerHandler(webServer, "/capture", captureHandler) ||
      !registerHandler(webServer, "/health", healthHandler)) {
    return false;
  }

  httpd_config_t streamConfig = HTTPD_DEFAULT_CONFIG();
  streamConfig.server_port = 81;
  streamConfig.ctrl_port = webConfig.ctrl_port + 1;

  if (httpd_start(&streamServer, &streamConfig) != ESP_OK) {
    return false;
  }

  return registerHandler(streamServer, "/stream", streamHandler);
}

static bool initializeCamera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = CAMERA_PIN_Y2;
  config.pin_d1 = CAMERA_PIN_Y3;
  config.pin_d2 = CAMERA_PIN_Y4;
  config.pin_d3 = CAMERA_PIN_Y5;
  config.pin_d4 = CAMERA_PIN_Y6;
  config.pin_d5 = CAMERA_PIN_Y7;
  config.pin_d6 = CAMERA_PIN_Y8;
  config.pin_d7 = CAMERA_PIN_Y9;
  config.pin_xclk = CAMERA_PIN_XCLK;
  config.pin_pclk = CAMERA_PIN_PCLK;
  config.pin_vsync = CAMERA_PIN_VSYNC;
  config.pin_href = CAMERA_PIN_HREF;
  config.pin_sccb_sda = CAMERA_PIN_SIOD;
  config.pin_sccb_scl = CAMERA_PIN_SIOC;
  config.pin_pwdn = CAMERA_PIN_PWDN;
  config.pin_reset = CAMERA_PIN_RESET;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_DRAM;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  }

  esp_err_t result = esp_camera_init(&config);
  if (result != ESP_OK) {
    Serial.printf("Camera initialization failed: 0x%x\n", result);
    return false;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  if (sensor != nullptr) {
    sensor->set_framesize(sensor, FRAMESIZE_QVGA);
    sensor->set_hmirror(sensor, 1);
  }

  return true;
}

static bool connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(CAMERA_WIFI_SSID, CAMERA_WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  unsigned long connectionStartedMillis = millis();

  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - connectionStartedMillis >= 30000UL) {
      Serial.println("\nWi-Fi connection timed out");
      return false;
    }

    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected");
  return true;
}

static void synchronizeClock() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Synchronizing clock");
  unsigned long syncStartedMillis = millis();

  while (time(nullptr) < 1700000000 &&
         millis() - syncStartedMillis < 10000UL) {
    delay(250);
    Serial.print(".");
  }

  if (time(nullptr) >= 1700000000) {
    Serial.println("\nClock synchronized");
  } else {
    Serial.println(
        "\nClock sync timed out; heartbeat-change fallback enabled");
  }
}

static void initializeFirebase() {
  firebaseConfig.api_key = CAMERA_FIREBASE_API_KEY;
  firebaseConfig.database_url = CAMERA_FIREBASE_DATABASE_URL;
  firebaseConfig.token_status_callback = tokenStatusCallback;

  firebaseAuth.user.email = CAMERA_FIREBASE_USER_EMAIL;
  firebaseAuth.user.password = CAMERA_FIREBASE_USER_PASSWORD;

  Firebase.reconnectNetwork(true);
  firebaseData.setBSSLBufferSize(4096, 1024);
  firebaseData.setResponseSize(1024);
  Firebase.begin(&firebaseConfig, &firebaseAuth);
}

static bool cameraHeartbeatIsFresh() {
  if (!Firebase.RTDB.getDouble(&firebaseData, CAMERA_HEARTBEAT_PATH)) {
    Serial.printf(
        "Camera heartbeat read failed: %s\n",
        firebaseData.errorReason().c_str());
    return false;
  }

  double heartbeatMillis = firebaseData.doubleData();
  double currentEpochMillis = static_cast<double>(time(nullptr)) * 1000.0;
  double heartbeatAgeMillis = currentEpochMillis - heartbeatMillis;
  unsigned long currentMillis = millis();

  if (!heartbeatValueInitialized) {
    lastObservedHeartbeatMillis = heartbeatMillis;
    heartbeatValueInitialized = true;
  } else if (heartbeatMillis != lastObservedHeartbeatMillis) {
    lastObservedHeartbeatMillis = heartbeatMillis;
    lastHeartbeatChangeMillis = currentMillis;
  }

  bool absoluteTimeIsFresh =
      currentEpochMillis >= 1700000000000.0 &&
      heartbeatAgeMillis >= -5000.0 &&
      heartbeatAgeMillis <= CAMERA_HEARTBEAT_MAX_AGE_MS;
  bool heartbeatRecentlyChanged =
      heartbeatMillis > 0.0 &&
      lastHeartbeatChangeMillis != 0 &&
      currentMillis - lastHeartbeatChangeMillis <=
          CAMERA_HEARTBEAT_MAX_AGE_MS;

  return absoluteTimeIsFresh || heartbeatRecentlyChanged;
}

static bool publishRealtimeSnapshot() {
  camera_fb_t *frame = esp_camera_fb_get();
  if (frame == nullptr) {
    Serial.println("Realtime snapshot capture failed");
    return false;
  }

  bool uploaded = Firebase.RTDB.setBlob(
      &firebaseData,
      CAMERA_SNAPSHOT_BLOB_PATH,
      frame->buf,
      frame->len);

  esp_camera_fb_return(frame);

  if (!uploaded) {
    Serial.printf(
        "Realtime snapshot upload failed: %s\n",
        firebaseData.errorReason().c_str());
    return false;
  }

  if (!Firebase.RTDB.setTimestamp(
          &firebaseData, CAMERA_SNAPSHOT_UPDATED_PATH)) {
    Serial.printf(
        "Snapshot timestamp update failed: %s\n",
        firebaseData.errorReason().c_str());
    return false;
  }

  Serial.println("Realtime snapshot uploaded");
  return true;
}

static void setFlashlight(bool enabled) {
  if (enabled == flashlightEnabled) {
    return;
  }

  flashlightEnabled = enabled;
  digitalWrite(CAMERA_FLASHLIGHT_PIN, enabled ? HIGH : LOW);
  Serial.println(enabled ? "Flashlight enabled" : "Flashlight disabled");
}

static void serviceFlashlight() {
  if (!Firebase.ready()) {
    return;
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastFlashlightPollMillis <
      CAMERA_FLASHLIGHT_POLL_MS) {
    return;
  }

  lastFlashlightPollMillis = currentMillis;
  if (!Firebase.RTDB.getBool(&firebaseData, CAMERA_FLASHLIGHT_PATH)) {
    Serial.printf(
        "Flashlight state read failed: %s\n",
        firebaseData.errorReason().c_str());
    return;
  }

  setFlashlight(firebaseData.boolData());
}

static void serviceCloudSnapshots() {
  if (!Firebase.ready()) {
    return;
  }

  unsigned long currentMillis = millis();

  if (currentMillis - lastHeartbeatPollMillis >=
      CAMERA_HEARTBEAT_POLL_MS) {
    lastHeartbeatPollMillis = currentMillis;
    bool requested = cameraHeartbeatIsFresh();

    if (requested != cloudSnapshotsActive) {
      cloudSnapshotsActive = requested;
      Serial.println(
          cloudSnapshotsActive
              ? "Cloud snapshots activated"
              : "Cloud snapshots paused");

      if (cloudSnapshotsActive) {
        lastSnapshotUploadMillis =
            currentMillis - CAMERA_SNAPSHOT_INTERVAL_MS;
      }
    }
  }

  if (cloudSnapshotsActive &&
      currentMillis - lastSnapshotUploadMillis >=
          CAMERA_SNAPSHOT_INTERVAL_MS) {
    lastSnapshotUploadMillis = currentMillis;
    publishRealtimeSnapshot();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("Starting Aquify ESP32-CAM...");

  pinMode(CAMERA_FLASHLIGHT_PIN, OUTPUT);
  digitalWrite(CAMERA_FLASHLIGHT_PIN, LOW);

  if (!initializeCamera()) {
    Serial.println("Camera startup stopped");
    return;
  }

  if (!connectToWifi()) {
    Serial.println("Wi-Fi startup stopped");
    return;
  }

  synchronizeClock();
  initializeFirebase();

  if (!startCameraServers()) {
    Serial.println("Camera web server failed to start");
    return;
  }

  Serial.print("Camera page: http://");
  Serial.println(WiFi.localIP());
  Serial.print("Snapshot:    http://");
  Serial.print(WiFi.localIP());
  Serial.println("/capture");
  Serial.print("Live stream: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream");
}

void loop() {
  serviceFlashlight();
  serviceCloudSnapshots();
  delay(50);
}
