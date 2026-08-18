#pragma once

#include <Arduino.h>

// Set to 1 only when a flash partition with a filesystem is selected and
// local files have been uploaded. Firebase relay control does not need it.
#ifndef AQUA_ENABLE_LITTLEFS
#define AQUA_ENABLE_LITTLEFS 0
#endif

namespace Hardware {

// ESP32-S3 boards commonly reserve GPIO26-37 for flash/PSRAM. Use the safe
// low GPIOs below for the S3 sketch and verify labels on your exact board.
#if CONFIG_IDF_TARGET_ESP32S3
constexpr uint8_t FILTER_RELAY_PIN = 5;
constexpr uint8_t UV_RELAY_PIN = 6;
constexpr uint8_t FEEDER_SERVO_PIN = 7;
constexpr uint8_t WATER_LEVEL_PIN = 8;
constexpr uint8_t IR_FOOD_SENSOR_PIN = 9;
constexpr uint8_t TURBIDITY_ADC_PIN = 10;
#else
// Original ESP32 DevKit V1 wiring.
constexpr uint8_t FILTER_RELAY_PIN = 26;
constexpr uint8_t UV_RELAY_PIN = 27;
constexpr uint8_t FEEDER_SERVO_PIN = 13;
constexpr uint8_t WATER_LEVEL_PIN = 33;
constexpr uint8_t IR_FOOD_SENSOR_PIN = 32;
constexpr uint8_t TURBIDITY_ADC_PIN = 34;
#endif

// expressions default
constexpr uint8_t RELAY_ON = LOW;
constexpr uint8_t RELAY_OFF = HIGH;
constexpr uint8_t WATER_LOW_SIGNAL = LOW;
constexpr uint8_t IR_OBSTACLE_SIGNAL = LOW;

constexpr uint16_t FEEDER_CLOSED_DEGREES = 15;
constexpr uint16_t FEEDER_OPEN_DEGREES = 105;
constexpr uint32_t FEED_INTERVAL_SECONDS = 6UL * 60UL * 60UL;

// TDS calibration helping 
constexpr uint16_t TURBIDITY_CLEAR_RAW = 3000;
constexpr uint16_t TURBIDITY_DIRTY_RAW = 1200;
constexpr uint8_t DIRTY_WATER_THRESHOLD_PERCENT = 60;

// Time imports
constexpr int32_t LOCAL_UTC_OFFSET_SECONDS = 5 * 3600 + 30 * 60;
constexpr uint8_t UV_START_HOUR = 18;
constexpr uint8_t UV_STOP_HOUR = 6;

constexpr bool CLEANING_SUPPORTED = false;

} 
