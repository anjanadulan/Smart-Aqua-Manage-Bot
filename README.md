# Smart Aqua Manage Bot (v2.0)

A highly reliable, decentralized, and standalone aquarium management ecosystem powered by local microcontrollers, physical sensors, and a real-time responsive 3D web interface. 

By prioritizing high-reliability local hardware loops over complex cloud networks, this bot ensures zero-latency task execution, maximum safety fail-safes, and a fully automated maintenance schedule—completely free of external dependencies or cloud connectivity.

---

## System Architecture Diagram

The Smart Aqua Manage Bot operates completely offline on a standalone localized loop. The main controllers (NodeMCU and ESP32-CAM) establish a local Wi-Fi access point (AP) or connect to a local router, serving WebSockets and HTTP protocols to host the web dashboard and stream real-time telemetry.

```
                  +-------------------------------------------------+
                  |             Responsive Web Dashboard            |
                  |     (HTML5, Vanilla CSS, Three.js, Vanilla JS)  |
                  +--------+-------------------------------+--------+
                           ^                               ^
                           | HTTP / MJPEG Stream           | WebSockets / HTTP
                           | (Port 80/81)                  | (Port 80/82)
                           v                               v
                +----------+----------+         +----------+----------+
                |  ESP32-CAM Module   |         |  NodeMCU Controller |
                | (Secondary Stream)  |         |   (Core Controller) |
                +---------------------+         +----------+----------+
                                                           |
      +------------------------+---------------------------+------------------------+------------------------+
      |                        |                           |                        |                        |
      v                        v                           v                        v                        v
+-----+------+           +-----+------+              +-----+------+           +-----+------+           +-----+------+
| Feeder Unit|           |Water/UV Lts|              |Glass Clean |           | Water Level|           | pH Sensor  |
| -SG90 Servo|           | -5V Relay  |              | -Stepper   |           | -Capacitive|           | -pH-4502C  |
| -IR Sensor |           |  (2-Ch)    |              |  -Driver   |           |  Sensor    |           |  Analog pH |
+------------+           +------------+              +------------+           +------------+           +------------+
```

---

## Functional Specification Matrix

### 🥖 1. Feeding & Automation Functions
* **6-Hour Scheduled Feeding Loop:** A local script running on the NodeMCU automatically triggers a physical feeding cycle every 6 hours by driving the SG90 Micro-Servo Motor to release a portion of food.
* **Local Surface Barrier Scan:** Before dropping food, the system scans the surface zone utilizing an Infrared (IR) Obstacle Avoidance Sensor module mounted inside a floating feeding ring.
* **Intelligent Skip Override:** If the IR sensor detects unconsumed floating food remaining on the surface, the NodeMCU aborts the automated cycle immediately to prevent hazardous overfeeding and organic water decay.
* **Monospace Countdown Telemetry:** Calculates and displays a precise numerical countdown ($hh:mm:ss$) on the web dashboard showing the remaining time until the next automatic feed.
* **Physical Feed Override Button:** A dedicated dashboard switch that triggers the feeding servo immediately, completely bypassing the IR surface sensor check.

### 🎛️ 2. Water Filtration & UV Control Functions
* **Filter Pump Toggle Switch:** Web dashboard commands route to the NodeMCU to engage or cut power to the primary AC water filtration pump by toggling a channel on the 5V Relay Board.
* **UV Sterilizer Toggle Switch:** Independent dashboard command to toggle a second channel on the 5V Relay Board to activate/deactivate the germicidal UV clarifier lamp to control algae spores and clear turbidity.

### 🚨 3. Safety & Monitoring Functions
* **Critical Water Level Monitoring:** Active, continuous tracking of the aquarium's volume via a Capacitive Water Sensor mounted externally or internally on the glass panel.
* **Direct Emergency Routing:** If the water level drops below the designated safe threshold, the NodeMCU immediately overrides the web dashboard timeline, routing real-time warnings directly to the top of the interface.

### 🧼 4. Automated Glass Cleaning Functions
* **Accumulated Run-Time Tracker & Logic:** Logs the cumulative running hours of the UV light and ambient lighting systems, which directly correlate to predicted algae accumulation rates. Every $168\text{ hours}$ (7 days) of total lighting runtime, the system flags the glass panel as degraded or "dirty."
* **Automated Cleaning Cycle Activation:** The NodeMCU automatically triggers the High-Torque Stepper Motor driven by the Stepper Motor Driver Breakout Board, moving a magnetic glass-scraper carriage horizontally back and forth across the front pane.
* **Web UI Maintenance Alert:** Pushes an amber status card reading *"Automated Glass Cleaning in Progress"* to the web timeline and applies a green, cloudy texture layer over the 3D tank interface model during active sweeps.
* **Manual Reset & Run Switch:** A dashboard control button to force an instant glass cleaning cycle on demand and reset the accumulated run-time tracker back to zero.

### 🧪 5. Water Quality & Fish Monitoring Functions
* **pH Level Monitoring Function:** Captures raw analog signals from the Analog pH Sensor (pH-4502C), runs calibration algorithms locally on the NodeMCU, and streams real-time water acidity updates to an interactive arc-gauge widget on the dashboard.
* **Fish Movement & Video Monitoring Function:** The independent ESP32-CAM Module hosts a localized HTTP MJPEG video stream broadcasted straight to a Live Preview container frame on the web dashboard for remote physical inspection.

---

## Master Bill of Materials

| Category | Component Name | Description & Quantity |
| :--- | :--- | :--- |
| **🧠 Core Controllers & Power** | **NodeMCU Microcontroller (ESP32 or ESP8266)** | Main controller running the schedules, monitoring logic, and sensor-actuator loops. |
| | **ESP32-CAM Module** | Secondary processing module equipped with an OV2640 camera to stream MJPEG video feed. |
| **🔌 Switching & Motor Drivers** | **5V Relay Board** | Digital low-voltage relay board to isolate and switch high-voltage AC filter pump and UV sterilizer loads. |
| | **Stepper Motor Driver Breakout Board** | Breakout driver (e.g., A4988) to deliver high-current step and direction control pulses. |
| **🧲 Actuators & Mechanical** | **SG90 Micro-Servo Motor** | High-precision mini servo to rotate the food-dispensing mechanism during feed cycles. |
| | **High-Torque Stepper Motor** | NEMA-style stepper motor to drive the belt-driven magnetic glass-scraper carriage. |
| **📡 Sensors & Water Quality** | **Infrared (IR) Obstacle Avoidance Sensor module** | Transmits and detects IR reflections to scan the feeding ring surface for leftovers. |
| | **Analog pH Sensor (pH-4502C)** | Water testing probe with signal conditioning board to measure water acidity (pH). |
| | **Capacitive Water Sensor** | Contactless capacitive sensor attached to the glass to monitor the water volume threshold. |

---

## Responsive Web Dashboard Layout Guide

The user interface is structured as a unified, fully responsive single-page dashboard optimized for desktop, tablet, and mobile browsers:

```
+---------------------------------------------------------------------------------+
|                            SMART AQUA MANAGE BOT (v2.0)                         |
+--------------------------+------------------------------+-----------------------+
|  Panel 1: Control Center | Panel 2: Live View & Commands| Panel 3: Status Log   |
|                          |                              |                       |
|   [ 3D Viewport ]        |  [ Live Video Stream ]       |  Timeline Registry:   |
|                          |  - (ESP32-CAM MJPEG Feed)    |                       |
|   * Dynamic Y-Scale      |                              |  [Cyan] Filter Active |
|     Water Mesh           |  [ pH Level Arc-Gauge ]      |  [Cyan] UV Lamp ON    |
|                          |  - Real-time pH: 7.2         |                       |
|   * UV violet ambient    |                              |  [Amber] Cleaning...  |
|     glow overlay         |  [ Telemetry & Countdown ]   |                       |
|                          |                              |  [Amber] Feed Skipped |
|   * Rising particle      |  [ Manual Action Buttons ]   |                       |
|     bubble simulation    |  - Filter | UV Light         |  [Red] LOW WATER!     |
|                          |  - Feed   | Clean Glass      |                       |
+--------------------------+------------------------------+-----------------------+
```

### 🎛️ Panel 1: 3D Three.js Viewport Control Center
An interactive 3D render of the aquarium tank using **Three.js** that visually mirrors the real-time state of the physical hardware:
* **Water Level:** Programmatically scales the $Y$-axis of the water mesh based on raw capacitive sensor values.
* **UV Light Glow:** Renders a glowing violet ambient light overlay when the UV light switch is engaged.
* **Filter Pump Particles:** Emits a rising particle bubble system to indicate active water flow when the filter pump runs.
* **Dirty Glass Texture:** Mapped onto the front pane, this green, cloudy texture gradually increases opacity as the accumulated lighting clock counts up, clearing back to transparent after a cleaning cycle completes.

### 📊 Panel 2: Live Preview & Manual Commands (with pH Gauge)
Houses real-time analog and digital telemetry coupled with physical overrides:
* **Live Video Preview:** Contains the local HTTP MJPEG stream broadcast directly by the ESP32-CAM module to observe fish movement.
* **pH Arc-Gauge Widget:** An interactive radial gauge displaying calibrated pH data (0.0 to 14.0) with custom color ranges for acidic, neutral, and alkaline states.
* **Countdown Telemetry:** Monospaced clock ($hh:mm:ss$) showing the time remaining until the next automatic feed cycle.
* **Manual Override Switches:** Interactive buttons to force an instant feed (bypassing the surface sensor), toggle the filtration pump relay, toggle the UV light relay, or trigger an unscheduled glass cleaning sweep.

### 📜 Panel 3: Chronological Notification Registry Logs
A running history log of system-level activities, structured using distinct, color-coded status cards:
* <span style="color:#06b6d4">**Cyan (Routine):**</span> Confirms normal operation events, such as manual override activations, successful feeding runs, and scheduled filtration triggers.
* <span style="color:#f59e0b">**Amber (Automated Adjustments):**</span> Informs the user of system-managed corrections, including active glass cleaning sweeps and skipped feeds (overfeeding prevention).
* <span style="color:#ef4444">**Red (Critical Alarms):**</span> Demands immediate physical attention, triggered by severe hardware faults or critical water level drops.

---

## Safety & Maintenance Fail-safe Disclaimers

> [!IMPORTANT]
> **Electrical Safety Standard**
> All high-voltage AC relays, ballasts, and connection blocks MUST be isolated inside a sealed, moisture-proof IP65-rated project enclosure placed completely away from potential water splash zones. Always plug high-voltage aquarium appliances (AC filter pumps and UV ballasts) into Ground Fault Circuit Interrupter (GFCI) outlets.

> [!CAUTION]
> **UV Radiation Exposure**
> Germicidal Ultraviolet light (UV-C) is hazardous to human skin and eyes. Ensure the UV light module is fully shielded inside an opaque filter canister or enclosed chamber. Never operate the UV lamp outside its protective enclosure or look directly at an active bulb.

> [!NOTE]
> **Sensor Calibration & Fail-safe Mode**
> The pH-4502C probe requires periodic manual calibration using buffer solutions (pH 4.01, 7.00, and 9.18) to prevent drift. All sensor inputs operate on pull-up/pull-down high-impedance states; if any sensor connection is severed or unplugged, the system defaults to a fail-safe alarm state (cutting power to UV/heaters and issuing a RED alert).
