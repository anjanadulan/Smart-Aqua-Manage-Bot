Smart Aqua Manage Bot (v2.0)

An advanced, decentralized, and standalone aquarium management ecosystem powered by local microcontrollers, physical sensors, and a real-time responsive 3D web interface.

By prioritizing high-reliability local hardware loops over complex cloud networks, this bot ensures zero-latency task execution, maximum safety fail-safes, and a fully automated maintenance schedule—including an innovative motorized glass-cleaning system.

🛠️ System Component Architecture

                       +-----------------------------+
                       |   Interactive 3D Web App    |
                       | (Three.js / Tailwind CSS)   |
                       +--------------+--------------+
                                      |
                                      | Local Wi-Fi / WebSockets
                                      v
                       +-----------------------------+
                       |      NodeMCU Controller     |
                       |       (ESP8266/ESP32)       |
                       +--------------+--------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
|   Feeder Unit    |         | Water & UV Relays|         | Glass Cleaning   |
| - Servo Actuator |         | - AC Filter Pump |         | - Stepper Motor  |
| - IR Surface Scan|         | - UV Sterilizer  |         | - Tracker Timer  |
+------------------+         +------------------+         +------------------+
         |                                                         |
         +-------------------> [Water Level Sensor] <--------------+


📋 System Functions Matrix

The Smart Aqua Manage Bot operates completely offline on a standalone localized loop. Below is the strict list of system-level functions:

🥖 1. Feeding & Automation Functions

6-Hour Scheduled Feeding Loop: A local internal timer automatically triggers a physical feeding routine every 6 hours.

Local Surface Barrier Scan: Prior to dropping food, the system scans the surface zone utilizing an Infrared (IR) beam or Light-Dependent Resistor (LDR) barrier mounted inside a floating feeding ring.

Intelligent Skip Override: If the surface scan detects leftover floating food, the upcoming scheduled feeding cycle is immediately aborted to prevent hazardous overfeeding and organic water decay.

Monospace Countdown Telemetry: Calculates and displays a precise numerical countdown ($hh:mm:ss$) on the web dashboard showing the time remaining until the next automatic feed.

Physical Feed Override Button: A dedicated dashboard switch that triggers the feeding servo immediately, completely bypassing the surface sensor check.

🎛️ 2. Water Filtration & UV Control Functions

Filter Pump Toggle Switch: An instantaneous mechanical switch in the Web UI to engage or cut power to the primary AC water filtration pump relay.

UV Sterilizer Toggle Switch: An independent control switch on the dashboard to activate or deactivate the germicidal Ultraviolet light bulb to control algae spores and clear turbidity.

🚨 3. Safety & Monitoring Functions

Critical Water Level Monitoring: Active, continuous tracking of the aquarium's volume via physical float switches or non-contact liquid level sensors.

Direct Emergency Routing: If the water level drops below the designated threshold, critical alarm indicators immediately override the web interface, routing real-time warnings directly to localized alert logs.

🧼 4. Automated Glass Cleaning Functions

Accumulated Run-Time Tracker: Logs the cumulative running hours of the UV light and ambient lighting systems, which directly correlate to predicted algae accumulation rates.

Glass Condition Estimation Logic: Every $168\text{ hours}$ (7 days) of total lighting runtime, the system flags the aquarium glass panel as degraded or "dirty."

Automated Cleaning Cycle Activation: The NodeMCU automatically triggers a high-torque continuous servo or stepper motor drive system, moving a magnetic glass-scraper carriage horizontally back and forth across the front pane.

Web UI Glass Maintenance Alert: Pushes an amber status card reading "Automated Glass Cleaning in Progress" to the web timeline and applies a green, cloudy texture layer over the 3D tank interface model during active sweeps.

Manual Reset & Run Switch: Provides a dashboard control button to force an instant glass cleaning cycle on demand and reset the accumulated run-time tracker back to zero.

🔌 Hardware Setup & Interfacing (Conceptual)

To achieve maximum isolation and electrical protection for aquatic systems, we utilize a decentralized, opto-isolated wiring topology:

Digital Relay Board: Isolates the low-voltage electronics of your NodeMCU from high-voltage AC utility lines running the filtration pumps and heavy UV ballasts.

Motor Driver Module: Employs an H-bridge driver (e.g., A4988 or L298N) to control the high-torque stepper/servo drive belt that runs the magnetic scraper carriage.

Fail-Safe Circuitry: Sensors default to high-impedance closed states, ensuring that if a cable is severed or disconnected, the system triggers an emergency warning.

🎨 Web App Layout & UI Specs

The frontend interface is a unified, fully responsive single-page responsive dashboard divided into three balanced interactive panels:

Panel 1: Control Center (3D Viewport)

Three.js Interactive Model: A stylized, low-poly 3D render of your aquarium tank. It reacts dynamically to hardware updates:

Water Level: Scales its $Y$-axis mesh programmatically based on the water level sensor status.

UV Active: Fades in a glowing violet interior ambient light when the UV light is toggled.

Active Filtration: Emits a vertical stream of particle bubbles when the filter pump runs.

Dirty Glass: Gradually renders a green-tinted cloudy texture over the glass panel mesh as the run-time clock increases.

Panel 2: Live View & Manual Commands

Shows direct telemetry data from the local sensors.

Features sleek, modern switches with custom animation transitions for the Filter unit, UV Light system, manual feeding override, and forced glass cleaning.

Panel 3: Status & Historical Alerts Log

Presents a clean, chronological timeline styled with color-coded operational cards:

Cyan: Routine activities (e.g., filter cycles, successful feeds).

Amber: Automated adjustments (e.g., skipped feeds, active glass cleaning cycles).

Red: Critical alarms (e.g., low water level alerts).

🛡️ License & Safety Warning

This project is intended for educational and hobbyist aquarium use. Ensure all high-voltage AC relays are housed inside a moisture-proof project enclosure away from water splash zones. Always use Ground Fault Circuit Interrupter (GFCI) outlets for high-voltage aquarium appliances.
