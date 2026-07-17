# AquaFirebaseController (Arduino IDE sketch)

This folder is a self-contained Arduino IDE sketch for the ESP32 Dev Module. It reads the Firebase relay controls and drives the filtration pump and UV relay.

## Open and upload

1. Open `AquaFirebaseController.ino` in Arduino IDE.
2. Install the ESP32 board package and select **ESP32 Dev Module**.
3. Install these libraries from Library Manager:
   - ArduinoJson
   - WebSockets (Links2004 / Markus Sattler)
   - ESP32Servo
4. Open `secrets.h` and replace the placeholder Wi-Fi and Firebase values.
5. Select the correct serial port, upload at 115200, then open Serial Monitor at 115200 baud.

The Firebase device account must be enabled for Email/Password sign-in. The Realtime Database rules must allow this authenticated device UID to read and write the device status/control fields.

## Firebase fields used

The sketch reads these booleans every second:

- `devices/aqua-main/status/filtrationRelay`
- `devices/aqua-main/status/uvRelay`

It publishes the actual output state back to those same fields every five seconds. The filtration relay is forced off whenever the local water-level sensor reports a low/critical level.

## Wiring

- Filtration relay IN: GPIO 26
- UV relay IN: GPIO 27
- Water-level sensor: see `hardware_config.h`

The default relay logic is active-low. Change `RELAY_ACTIVE_LOW` in `hardware_config.h` if your relay board is active-high. Test with low-voltage loads first; use proper isolation and mains-rated protection for pumps or UV equipment.

`secrets.h` is intentionally ignored by Git. Keep real credentials only in that local file.

