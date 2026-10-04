package com.smartparking.apartment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Smart Parking System - Apartment Edition backend.
 *
 * Run with: mvn spring-boot:run
 * API base URL: http://localhost:8080/api
 * H2 console (dev only): http://localhost:8080/h2-console
 *
 * @EnableScheduling turns on SlotHoldSweeper, which releases expired slot
 *                   holds every 20s (see app.slot.hold-minutes in
 *                   application.properties).
 */
@SpringBootApplication
@EnableScheduling
public class SmartParkingApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartParkingApplication.class, args);
    }

}