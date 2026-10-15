// package com.smartparking.apartment.repository;

// import com.smartparking.apartment.entity.Apartment;
// import org.springframework.data.jpa.repository.JpaRepository;

// public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
// }


package com.smartparking.apartment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartparking.apartment.entity.Apartment;

public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
}
