package com.smartparking.apartment.service;

import com.smartparking.apartment.entity.Apartment;

public interface ApartmentService {

    /**
     * Returns the single apartment building this system serves.
     * TODO: implement — fetch from ApartmentRepository.
     */
    Apartment getApartmentDetails();

}
