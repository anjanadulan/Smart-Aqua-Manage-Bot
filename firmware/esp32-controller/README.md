# ESP32 Controller Prototype

This firmware targets an ESP32 DevKit V1 and serves the Web UI from LittleFS. It owns the local safety, feeding, filtration, water-clarity, and UV schedule state. The browser is a client, not the automation authority.

## Prototype hardware

| Function | ESP32 pin | Notes |
|---|---:|---|
| Filter relay | GPIO 26 | Active-low by default; verify your relay board |
| UV relay | GPIO 27 | Active-low by default; verify your relay board |
| Feeder servo | GPIO 13 | Power from a separate regulated 5 V rail with common ground |
| Low-water threshold sensor | GPIO 33 | Digital input, active-low by default |
| IR food sensor | GPIO 32 | Digital input, active-low by default |
| Turbidity sensor | GPIO 34 | ADC input only; signal must never exceed 3.3 V |

The NodeMCU and three Arduino Uno boards are not required for this first controller build. Keep them available for later isolation of the CNC gantry or other subsystems.

## Build and flash

1. Install PlatformIO.
2. Copy `include/secrets.example.h` to `include/secrets.h` and set Wi-Fi/AP credentials plus the Firebase device credentials. Use the dedicated ESP32 Firebase account, not the web operator account.
3. Connect the ESP32 DevKit.
4. Run `pio run -t upload`.
5. Run `pio run -t uploadfs` to upload the Web UI.
6. Open the serial monitor at 115200 baud and browse to the printed controller IP.

### Firebase relay control

The controller authenticates to Firebase over HTTPS REST and polls these fields every second:

```text
devices/aqua-main/status/filtrationRelay
devices/aqua-main/status/uvRelay
```

The web UI writes `true` or `false` to those child paths. The ESP32 applies the values to GPIO 26 and GPIO 27, then publishes the actual relay state back to Firebase. The local low-water safety lock always has priority and can force filtration off.

The prototype uses TLS with certificate verification disabled in `main.cpp` to simplify first-board testing. Replace `setInsecure()` with CA certificate validation before using the controller outside a trusted development network.

The pre-build script copies `3D/index.html`, `3D/styles.css`, and `3D/app.js` into the LittleFS data image. Do not edit generated `data/` files.

## Safety behavior

- Both relays boot off.
- Low water immediately forces the filtration relay off.
- Filtration stays off after water returns until an operator enables it again.
- Dirty water sends an alert but does not stop filtration.
- Scheduled feeding checks the IR sensor; manual feeding bypasses that check.
- UV auto mode is on from 18:00 through 06:00 only when the controller clock is valid.
- The CNC cleaner command is intentionally disabled until limit switches, motor pins, travel limits, and an emergency stop are configured.

## Calibration required

Set `TURBIDITY_CLEAR_RAW`, `TURBIDITY_DIRTY_RAW`, relay polarity, sensor polarity, and servo angles in `include/hardware_config.h` using your exact modules. The displayed clarity percentage is a calibrated operational indicator, not laboratory NTU.
