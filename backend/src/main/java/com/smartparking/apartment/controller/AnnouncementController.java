package com.smartparking.apartment.controller;

import com.smartparking.apartment.entity.Announcement;
import com.smartparking.apartment.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/announcements -> public, newest first. Read by HomePage so
 * visitors see whatever the admin has posted.
 */
@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @GetMapping
    public ResponseEntity<List<Announcement>> list() {
        return ResponseEntity.ok(announcementRepository.findAllByOrderByCreatedAtDesc());
    }
}
