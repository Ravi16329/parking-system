// package com.smartparking.apartment.repository;

// import com.smartparking.apartment.entity.Announcement;
// import org.springframework.data.jpa.repository.JpaRepository;

// import java.util.List;

// public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
//     List<Announcement> findAllByOrderByCreatedAtDesc();
// }


package com.smartparking.apartment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartparking.apartment.entity.Announcement;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByCreatedAtDesc();
}
