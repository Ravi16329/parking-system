package com.smartparking.apartment.controller;

import com.smartparking.apartment.entity.Apartment;
import com.smartparking.apartment.service.ApartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/apartment -> apartment details (name, address, image, totalSlots)
 */
@RestController
@RequestMapping("/api/apartment")
public class ApartmentController {

    @Autowired
    private ApartmentService apartmentService;

    @GetMapping
    public ResponseEntity<Apartment> getApartment() {
        // TODO: implement, e.g. return ResponseEntity.ok(apartmentService.getApartmentDetails());
        return ResponseEntity.ok(null);
    }

}
