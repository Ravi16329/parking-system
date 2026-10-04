package com.smartparking.apartment.service.impl;

import com.smartparking.apartment.entity.Apartment;
import com.smartparking.apartment.repository.ApartmentRepository;
import com.smartparking.apartment.service.ApartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ApartmentServiceImpl implements ApartmentService {

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Override
    public Apartment getApartmentDetails() {
        // TODO: implement, e.g. return apartmentRepository.findAll().stream().findFirst().orElse(null);
        return null;
    }

}
