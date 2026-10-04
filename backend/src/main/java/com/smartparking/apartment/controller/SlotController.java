package com.smartparking.apartment.controller;

import com.smartparking.apartment.entity.Slot;
import com.smartparking.apartment.exception.SlotUnavailableException;
import com.smartparking.apartment.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * GET /api/slots -> list of all slots + status
 * POST /api/slots/{id}/hold -> mark a slot HELD (called when a user clicks a
 * green slot)
 * POST /api/slots/{id}/release -> release a HELD slot back to AVAILABLE
 * (timeout or user cancels)
 */
@RestController
@RequestMapping("/api/slots")
public class SlotController {

    @Autowired
    private SlotService slotService;

    @GetMapping
    public ResponseEntity<List<Slot>> getAllSlots() {
        return ResponseEntity.ok(slotService.getAllSlots());
    }

    @PostMapping("/{slotId}/hold")
    public ResponseEntity<?> holdSlot(@PathVariable String slotId) {
        try {
            return ResponseEntity.ok(slotService.holdSlot(slotId));
        } catch (SlotUnavailableException e) {
            // Someone else already holds/occupies this bay — 409 Conflict,
            // not a generic error, so the frontend can tell the two apart.
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{slotId}/release")
    public ResponseEntity<Void> releaseSlot(@PathVariable String slotId) {
        try {
            slotService.releaseSlot(slotId);
            return ResponseEntity.ok().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Called once payment succeeds. This clears heldAt as well as setting
     * OCCUPIED, which matters: without it, a slot someone actually paid for
     * would still get swept back to AVAILABLE by the 3-minute hold timeout.
     */
    @PostMapping("/{slotId}/occupy")
    public ResponseEntity<Void> occupySlot(@PathVariable String slotId) {
        try {
            slotService.markOccupied(slotId);
            return ResponseEntity.ok().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}