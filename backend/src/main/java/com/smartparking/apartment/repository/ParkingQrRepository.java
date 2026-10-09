
package com.smartparking.apartment.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smartparking.apartment.entity.ParkingQr;

import jakarta.persistence.LockModeType;

public interface ParkingQrRepository
        extends JpaRepository<ParkingQr, String> {

    Optional<ParkingQr> findByBookingId(String bookingId);

    Optional<ParkingQr> findByToken(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT q FROM ParkingQr q WHERE q.token = :token")
    Optional<ParkingQr> findByTokenForUpdate(
            @Param("token") String token);
}
