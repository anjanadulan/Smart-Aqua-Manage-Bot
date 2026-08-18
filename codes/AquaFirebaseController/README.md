# AquaFirebaseController (Arduino IDE sketch)

This folder is a self-contained Arduino IDE sketch for the ESP32-S3 Dev Module. It reads the Firebase relay controls and drives the filtration pump and UV relay.

## Open and upload

1. Open `AquaFirebaseController.ino` in Arduino IDE.
2. Install the ESP32 board package and select **ESP32S3 Dev Module**. Enable **USB CDC On Boot** if you upload through the S3 USB port.
3. Install these libraries from Library Manager:
   - ArduinoJson
   - WebSockets (Links2004 / Markus Sattler)
   - ESP32Servo
4. Open `secrets.h` and replace the placeholder Wi-Fi and Firebase values.
5. Select the correct serial port, upload at 115200, then open Serial Monitor at 115200 baud.

The Firebase device account must be enabled for Email/Password sign-in. The Realtime Database rules must allow this authenticated device UID to read and write the device status/control fields.

LittleFS is disabled by default because this relay/Firebase sketch does not need local web files. That avoids the `partition "spiffs" could not be found` message. If you later host files from the ESP32, set `AQUA_ENABLE_LITTLEFS` to `1` in `hardware_config.h`, select an Arduino partition scheme that includes SPIFFS, and upload the filesystem image.

## Firebase fields used

The sketch reads these booleans every second:

- `devices/aqua-main/status/filtrationRelay`
- `devices/aqua-main/status/uvRelay`

It publishes the actual output state back to those same fields every five seconds. The filtration relay is forced off whenever the local water-level sensor reports a low/critical level.

## Wiring

- Filtration relay IN: GPIO 5 (ESP32-S3 default)
- UV relay IN: GPIO 6 (ESP32-S3 default)
- Feeder servo: GPIO 7
- Water-level input: GPIO 8
- Food IR input: GPIO 9
- Turbidity/TDS analog input: GPIO 10
- Water-level sensor: see `hardware_config.h`

The default relay logic is active-low. Verify these GPIO labels against your exact ESP32-S3 board before wiring. GPIO26–32 (and often GPIO33–37) are normally used by S3 flash/PSRAM and should not be used for relays. Test with low-voltage loads first; use proper isolation and mains-rated protection for pumps or UV equipment.

`secrets.h` is intentionally ignored by Git. Keep real credentials only in that local file.
