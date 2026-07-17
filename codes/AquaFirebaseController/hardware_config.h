Exit code: 0
Wall time: 0.6 seconds
Output:
#pragma once

#include <Arduino.h>

namespace Hardware {

// ESP32 DevKit V1 prototype pin map. Review against your exact board before wiring.
constexpr uint8_t FILTER_RELAY_PIN = 26;
constexpr uint8_t UV_RELAY_PIN = 27;
constexpr uint8_t FEEDER_SERVO_PIN = 13;
constexpr uint8_t WATER_LEVEL_PIN = 33;
constexpr uint8_t IR_FOOD_SENSOR_PIN = 32;
constexpr uint8_t TURBIDITY_ADC_PIN = 34;

// Common relay boards are active LOW. Change this only after checking your board.
constexpr uint8_t RELAY_ON = LOW;
constexpr uint8_t RELAY_OFF = HIGH;
constexpr uint8_t WATER_LOW_SIGNAL = LOW;
constexpr uint8_t IR_OBSTACLE_SIGNAL = LOW;

constexpr uint16_t FEEDER_CLOSED_DEGREES = 15;
constexpr uint16_t FEEDER_OPEN_DEGREES = 105;
constexpr uint32_t FEED_INTERVAL_SECONDS = 6UL * 60UL * 60UL;

// Calibrate these with samples of known clean and dirty aquarium water.
// The conversion produces a clarity percentage, not laboratory-grade NTU.
constexpr uint16_t TURBIDITY_CLEAR_RAW = 3000;
constexpr uint16_t TURBIDITY_DIRTY_RAW = 1200;
constexpr uint8_t DIRTY_WATER_THRESHOLD_PERCENT = 60;

// Sri Lanka Standard Time is UTC+05:30 and has no daylight-saving change.
constexpr int32_t LOCAL_UTC_OFFSET_SECONDS = 5 * 3600 + 30 * 60;
constexpr uint8_t UV_START_HOUR = 18;
constexpr uint8_t UV_STOP_HOUR = 6;

constexpr bool CLEANING_SUPPORTED = false;

}  // namespace Hardware


