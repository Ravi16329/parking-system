package com.smartparking.apartment.repository;

import com.smartparking.apartment.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface SlotRepository extends JpaRepository<Slot, String> {

    /**
     * Flips every HELD slot whose hold is older than cutoff back to AVAILABLE.
     * Called both lazily (before every read) and by the scheduled sweep, so a
     * hold never outlives app.slot.hold-minutes even if nobody happens to poll
     * in between.
     */
    @Modifying
    @Query("update Slot s set s.status = :available, s.heldAt = null " +
            "where s.status = :held and s.heldAt < :cutoff")
    int releaseExpiredHolds(
            @Param("held") Slot.Status held,
            @Param("available") Slot.Status available,
            @Param("cutoff") LocalDateTime cutoff);

    /**
     * Atomically holds a slot only if it is currently AVAILABLE. Doing the
     * check-and-set as one UPDATE (rather than read-then-save in Java) is
     * what actually prevents two users who click the same bay at the same
     * moment from both succeeding — whichever request's UPDATE runs first
     * wins the row; the second affects 0 rows and gets a conflict.
     */
    @Modifying
    @Query("update Slot s set s.status = :held, s.heldAt = :now " +
            "where s.id = :id and s.status = :available")
    int tryHold(
            @Param("id") String id,
            @Param("held") Slot.Status held,
            @Param("available") Slot.Status available,
            @Param("now") LocalDateTime now);
}