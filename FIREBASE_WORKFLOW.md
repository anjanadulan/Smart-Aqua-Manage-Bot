# Aqua System Firebase Workflow

This document defines the data contract between the Next.js web UI, Firebase Realtime Database, and the aquarium microcontrollers.

The system has two layers:

1. Local control and safety: the ESP32 continues operating when the internet is unavailable.
2. Cloud status and remote control: Firebase synchronizes state, schedules, and operator actions when Wi-Fi is available.

Firebase is not the safety controller.

## 1. Hardware roles

| Board | Responsibility | Firebase connection |
|---|---|---|
| ESP32 DevKit | Main controller, sensors, relays, feeder, glass cleaner | Yes; primary device |
| ESP32-CAM | Camera snapshots or future remote stream | Separate device later |
| NodeMCU | Optional sensor or actuator node | Direct Wi-Fi or serial to ESP32 |
| Arduino Uno boards | Local helper boards | UART, I2C, or RS485 to ESP32 |

The ESP32 DevKit is authoritative for device ID aqua-main.

## 2. Firebase identities

| Account | UID | Purpose |
|---|---|---|
| Web operator | OO78LS08j6SgfysuxR6e6QbMDtD2 | Read data and change approved controls/configuration |
| ESP32 device | gXQDrJdJnwOKDxR8iQe0ywyjiU92 | Write sensor status and read/write device control fields |

Never put passwords in this file, firmware, or Git.

The ownership mappings are stored at the database root:

    deviceOwners/aqua-main/OO78LS08j6SgfysuxR6e6QbMDtD2 = true
    deviceUsers/aqua-main/gXQDrJdJnwOKDxR8iQe0ywyjiU92 = true

## 3. Firebase project configuration

Project: aqua-bot-dcbe0

Realtime Database:

    https://aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app

Enable Authentication > Email/Password and create the operator and device accounts.

The web configuration belongs in connection/webUi/.env.local:

    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aqua-bot-dcbe0.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=aqua-bot-dcbe0
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aqua-bot-dcbe0.firebasestorage.app
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=892650861943
    NEXT_PUBLIC_FIREBASE_APP_ID=1:892650861943:web:5084641dc2868a7efe9d72
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-GWF4P561C8
    FIREBASE_OPERATOR_UID=OO78LS08j6SgfysuxR6e6QbMDtD2
    SESSION_SECRET=at-least-32-random-characters
    COOKIE_SECURE=false
    ENABLE_LOCAL_LOGIN=false

NEXT_PUBLIC_FIREBASE values are client configuration, not Admin credentials. Never put a Firebase service-account private key in a NEXT_PUBLIC variable.

## 4. Realtime Database schema

    deviceOwners/
      aqua-main/
        <operator-uid>: true

    deviceUsers/
      aqua-main/
        <device-uid>: true

    devices/
      aqua-main/
        config/
          feedingIntervalHours: 6
          cleaningIntervalDays: 7

        status/
          online: true
          waterLevel: "BEST"
          waterQuality: "GOOD"
          tdsPpm: 148
          temperatureC: 26.4

          filtrationRelay: false
          uvRelay: false
          feederActive: false
          glassCleanerActive: false

          lastFedAt: 0
          nextFeedAt: 0
          lastCleanedAt: 0
          nextCleanAt: 0

        heartbeat/
          lastSeen: 0
          firmware: "0.1.0"

### Status values

- waterLevel: BEST, MEDIUM, LOW, or CRITICAL
- waterQuality: GOOD, AVERAGE, or BAD
- tdsPpm: calibrated TDS reading in ppm
- temperatureC: water temperature in Celsius
- Relay and active fields are booleans.
- Timestamp fields are UTC Unix milliseconds. The web UI also accepts Unix seconds for compatibility.

## 5. Read/write permission matrix

| Path | Web operator | ESP32 device |
|---|---|---|
| devices/aqua-main/status read | Allowed | Not required at parent |
| status/filtrationRelay read/write | Read/write | Read/write |
| status/uvRelay read/write | Read/write | Read/write |
| status/feederActive read/write | Read/write | Read/write |
| status/glassCleanerActive read/write | Read/write | Read/write |
| Sensor status fields | Read | Write |
| status/last*At and next*At | Read | Write |
| devices/aqua-main/config read | Allowed | Allowed |
| devices/aqua-main/config write | Allowed | Denied |
| devices/aqua-main/heartbeat write | Denied | Allowed |
| devices/aqua-main/alerts read | Allowed | Write |

Rules source:

    connection/webUi/firebase/database.rules.json

The local rules file is not automatically published. Copy it into Firebase Console > Realtime Database > Rules and click Publish after every rule change.

## 6. Web UI authentication flow

1. The operator enters Firebase email and password at /login.
2. The browser calls signInWithEmailAndPassword.
3. The browser obtains a Firebase ID token.
4. The browser sends the token to /api/auth/firebase-session.
5. Next.js verifies the token using Firebase Auth accounts:lookup.
6. Next.js checks that the UID equals FIREBASE_OPERATOR_UID.
7. Next.js creates the signed, HTTP-only Aqua session cookie.
8. The dashboard renders and the Firebase browser session remains available for Realtime Database reads and writes.

The ESP32 account is never accepted as a web operator account.

## 7. Web UI data flow

### Live status reads

The dashboard subscribes to:

    devices/aqua-main/status
    devices/aqua-main/config

The live listener updates water level, TDS quality, temperature, sensor category states, countdowns, relay chips, feeder status, and cleaner status.

### Settings writes

The Settings page writes:

    devices/aqua-main/config/feedingIntervalHours
    devices/aqua-main/config/cleaningIntervalDays

It also mirrors the values into the local server store so server-rendered fallback content remains consistent. The ESP32 periodically reads config and applies the values locally.

### Filtration and UV controls

The web UI writes only one child field at a time:

    devices/aqua-main/status/filtrationRelay = true or false
    devices/aqua-main/status/uvRelay = true or false

The ESP32 reads those fields, drives the physical relays, and writes the resulting relay state back. The ESP32 must still override filtration locally for LOW or CRITICAL water.

### Feeder and glass cleaner controls

The web UI writes:

    devices/aqua-main/status/feederActive = true
    devices/aqua-main/status/glassCleanerActive = true

No command record is created. The ESP32 resets the active field to false after the physical cycle completes.

Old records under devices/aqua-main/commands are legacy data from the earlier command-queue design. New UI buttons do not use that path.

## 8. Timing and countdown workflow

Intervals and timestamps have different responsibilities:

    config/feedingIntervalHours = how often feeding should occur
    config/cleaningIntervalDays = how often cleaning should occur

    status/nextFeedAt = exact next feeding deadline
    status/nextCleanAt = exact next cleaning deadline

The web UI calculates:

    remaining = nextTimestamp - currentBrowserUtcTime

The countdown refreshes every second. The web UI does not decide that a physical action completed.

### Feeding cycle

1. ESP32 loads config and the persisted schedule from NVS or Preferences.
2. ESP32 synchronizes UTC time with NTP when internet is available.
3. ESP32 waits until currentTime is greater than or equal to nextFeedAt.
4. ESP32 checks local safety conditions and the surface IR sensor.
5. ESP32 writes feederActive = true.
6. The servo dispenses one portion.
7. ESP32 writes feederActive = false.
8. ESP32 writes lastFedAt = completion time.
9. ESP32 calculates nextFeedAt = completion time + interval hours.
10. The web UI immediately shows the new countdown.

Manual feeding follows the same sequence. The web button only requests feederActive = true; it does not claim that feeding has finished.

### Glass-cleaning cycle

1. ESP32 waits until currentTime is greater than or equal to nextCleanAt.
2. ESP32 writes glassCleanerActive = true.
3. The cleaning mechanism runs its complete cycle.
4. ESP32 writes glassCleanerActive = false.
5. ESP32 writes lastCleanedAt = completion time.
6. ESP32 calculates nextCleanAt = completion time + interval days.
7. The web UI displays the new countdown.

### Interval changes

When an interval changes, the ESP32 should recalculate:

    nextFeedAt = lastFedAt + feedingIntervalHours * 3,600,000
    nextCleanAt = lastCleanedAt + cleaningIntervalDays * 86,400,000

If no previous completion timestamp exists, initialize the next deadline after the first successful cycle or during commissioning.

## 9. ESP32 Firebase connection

The prototype uses HTTPS REST because it is practical for an ESP32.

### Authenticate the device

    POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=WEB_API_KEY

Body:

    {
      "email": "device-account-email",
      "password": "device-password-kept-out-of-git",
      "returnSecureToken": true
    }

Store the returned idToken, refreshToken, and expiration. Refresh the token after HTTP 401.

### Read configuration

    GET https://aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app/devices/aqua-main/config.json?auth=ID_TOKEN

### Upload status

    PUT https://aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app/devices/aqua-main/status.json?auth=ID_TOKEN

Example body:

    {
      "online": true,
      "waterLevel": "BEST",
      "waterQuality": "GOOD",
      "tdsPpm": 148,
      "temperatureC": 26.4,
      "filtrationRelay": false,
      "uvRelay": false,
      "feederActive": false,
      "glassCleanerActive": false,
      "lastFedAt": 0,
      "nextFeedAt": 0,
      "lastCleanedAt": 0,
      "nextCleanAt": 0
    }

For individual control or completion changes, write only the child field:

    PUT .../devices/aqua-main/status/filtrationRelay.json?auth=ID_TOKEN
    Body: true

    PUT .../devices/aqua-main/status/feederActive.json?auth=ID_TOKEN
    Body: false

Use HTTPS certificate validation and NTP time. Never print ID tokens or device passwords to serial logs.

## 10. Offline-first behavior

The following must work without Firebase:

- Low-water detection and filtration shutdown
- Relay safety defaults
- Feeder and cleaner cycle completion
- Schedule comparison and local timers
- Power-loss recovery from NVS or Preferences

When offline:

1. Continue local control and schedules.
2. Queue or coalesce telemetry locally.
3. Reconnect Wi-Fi with backoff.
4. Re-authenticate Firebase if the token expired.
5. Upload the latest status and timestamps after reconnecting.

Low-water safety:

    HW-038 = LOW or CRITICAL
    -> filtration relay OFF locally
    -> prevent unsafe feeding or cleaning when required
    -> write an alert to Firebase when online

Firebase must never be the only mechanism that shuts down a relay.

## 11. ESP32-CAM workflow

The current camera panel is a preview mockup. Realtime Database is not a video transport. Do not upload every video frame to RTDB.

Recommended architecture:

    ESP32-CAM -> direct MJPEG/WebRTC stream -> browser camera panel
    ESP32-CAM -> Firebase status/snapshot metadata -> web UI status

For a first local-network prototype, the ESP32-CAM can expose an MJPEG endpoint such as /stream. The browser connects directly to the camera IP. This is low latency on the same LAN, but it is not safe to expose directly to the public internet.

For remote access from anywhere, place a secure gateway or VPN in front of the camera. A Tailscale/private VPN is the simplest prototype option. A WebRTC gateway is the better long-term option for low latency. Avoid relaying continuous video through a Next.js API route because it increases latency and server bandwidth.

Firebase should carry only camera state and optional snapshots:

    devices/aqua-main/camera/
      online: true
      lastSeenAt: 0
      latestSnapshotUrl: "..."

A staged implementation is:

1. ESP32-CAM captures periodic JPEG snapshots.
2. Upload snapshots to Firebase Storage or a dedicated image endpoint.
3. Store the latest snapshot URL and cameraOnline status in Firebase.
4. The web UI displays the latest snapshot.

Firebase Storage is suitable for snapshots, not continuous low-latency video. Use WebRTC or a secure camera streaming service for real video.

## 12. Security rules deployment and tests

1. Open Firebase Console.
2. Open Realtime Database > Rules.
3. Paste connection/webUi/firebase/database.rules.json.
4. Click Publish.
5. Use Rules Playground with the operator and device UIDs.

Expected tests:

| Test | UID | Expected |
|---|---|---|
| Read status | operator UID | Allow |
| Write status/filtrationRelay | operator UID | Allow |
| Write status/feederActive | operator UID | Allow |
| Write sensor tdsPpm | operator UID | Deny |
| Write full sensor status | device UID | Allow |
| Read control fields | device UID | Allow |
| Read config | device UID | Allow |
| Write config | device UID | Deny |

Never publish global public write access.

## 13. Commissioning checklist

### Firebase and web UI

- [ ] Email/Password provider is enabled.
- [ ] Operator and device UIDs are mapped.
- [ ] Rules are published.
- [ ] Web operator login succeeds.
- [ ] Dashboard says Firebase live status connected.
- [ ] Settings change updates devices/aqua-main/config.
- [ ] Filtration and UV buttons update boolean status fields.
- [ ] Feeder and cleaner buttons set active fields to true.
- [ ] Countdown displays nextFeedAt and nextCleanAt after the controller writes them.

### ESP32

- [ ] Wi-Fi reconnect works.
- [ ] Device authentication works.
- [ ] Sensor status writes are accepted.
- [ ] Device can read the four web control fields.
- [ ] Device mirrors actual relay states.
- [ ] Device resets feeder/cleaner active fields after completion.
- [ ] Device writes last and next timestamps after completion.
- [ ] Low-water shutdown works with Wi-Fi disconnected.
- [ ] Schedule survives power loss.

## 14. Troubleshooting

### Dashboard shows fallback data

- Confirm the operator signed in through Firebase, not an old local session.
- Restart Next.js after changing .env.local.
- Confirm the Asia Southeast 1 database URL.
- Confirm the operator UID is under deviceOwners/aqua-main.
- Check the browser console for PERMISSION_DENIED.

### Settings save locally but not Firebase

- Confirm the web operator is signed in.
- Confirm the config write rule is published.
- Confirm devices/aqua-main/config is visible in the Data tab.

### Relay button does not change Firebase

- Confirm operator authentication.
- Confirm child rules for filtrationRelay and uvRelay are published.
- Refresh the Data tab and expand devices/aqua-main/status.
- A direct status write should not create a commands node.

### Countdown says Waiting for controller

The ESP32 has not written a valid nextFeedAt or nextCleanAt timestamp. The interval alone is not enough to know the exact remaining time. Complete one cycle or seed a commissioning timestamp, then confirm that the controller writes the next deadline.

## 15. Viewer-only users

The secure option for viewer-only accounts is a local Next.js viewer role plus a server-side read-only Firebase proxy. This avoids creating a Firebase user while keeping the database private. Do not make the full status path public unless only non-sensitive data is exposed.

## 16. Source files

    connection/webUi/lib/firebase-client.ts
    connection/webUi/app/api/auth/firebase-session/route.ts
    connection/webUi/app/components/live-system-status.tsx
    connection/webUi/app/components/schedule-countdown.tsx
    connection/webUi/app/components/status-control.tsx
    connection/webUi/app/settings/settings-form.tsx
    connection/webUi/firebase/database.rules.json

This workflow is the contract for the ESP32 firmware and future ESP32-CAM integration.
