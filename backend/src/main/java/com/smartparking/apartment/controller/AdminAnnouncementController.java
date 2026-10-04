package com.smartparking.apartment.controller;

import com.smartparking.apartment.entity.Announcement;
import com.smartparking.apartment.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Admin-only announcement management (protected by AdminAuthFilter).
 * Reading the list back uses the same public GET /api/announcements —
 * no separate admin read endpoint needed.
 */
@RestController
@RequestMapping("/api/admin/announcements")
public class AdminAnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String message = body.get("message") == null ? "" : body.get("message").trim();
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message can't be empty"));
        }
        Announcement saved = announcementRepository.save(new Announcement(message, LocalDateTime.now()));
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!announcementRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        announcementRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
