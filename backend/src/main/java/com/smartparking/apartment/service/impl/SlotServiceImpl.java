package com.smartparking.apartment.service.impl;

import com.smartparking.apartment.entity.Slot;
import com.smartparking.apartment.exception.SlotUnavailableException;
import com.smartparking.apartment.repository.SlotRepository;
import com.smartparking.apartment.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class SlotServiceImpl implements SlotService {

    @Autowired
    private SlotRepository slotRepository;

    /** How long a HELD slot stays reserved before it's released automatically. */
    @Value("${app.slot.hold-minutes:3}")
    private long holdMinutes;

    private LocalDateTime cutoffNow() {
        return LocalDateTime.now().minusMinutes(holdMinutes);
    }

    @Override
    @Transactional
    public List<Slot> getAllSlots() {
        slotRepository.releaseExpiredHolds(Slot.Status.HELD, Slot.Status.AVAILABLE, cutoffNow());
        return slotRepository.findAll();
    }

    @Override
    @Transactional
    public Slot holdSlot(String slotId) {
        // Release anything that's timed out first, in case this exact slot
        // is the one expiring right now.
        slotRepository.releaseExpiredHolds(Slot.Status.HELD, Slot.Status.AVAILABLE, cutoffNow());

        int updated = slotRepository.tryHold(slotId, Slot.Status.HELD, Slot.Status.AVAILABLE, LocalDateTime.now());
        if (updated == 0) {
            Slot existing = slotRepository.findById(slotId)
                    .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
            throw new SlotUnavailableException(
                    "Slot " + slotId + " is currently " + existing.getStatus().name().toLowerCase());
        }

        return slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
    }

    @Override
    @Transactional
    public void releaseSlot(String slotId) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
        slot.setStatus(Slot.Status.AVAILABLE);
        slot.setHeldAt(null);
        slotRepository.save(slot);
    }

    @Override
    @Transactional
    public void markOccupied(String slotId) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
        slot.setStatus(Slot.Status.OCCUPIED);
        slot.setHeldAt(null);
        slotRepository.save(slot);
    }
}