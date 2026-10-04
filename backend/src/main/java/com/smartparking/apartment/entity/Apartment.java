package com.smartparking.apartment.entity;

import jakarta.persistence.*;

/**
 * Represents the single apartment building this system serves.
 * (Scoped to one building, per the project spec — not multi-location.)
 */
@Entity
@Table(name = "apartment")
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String address;

    private int totalSlots;

    private String image;

    public Apartment() {
    }

    public Apartment(Long id, String name, String address, int totalSlots, String image) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.totalSlots = totalSlots;
        this.image = image;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public int getTotalSlots() {
        return totalSlots;
    }

    public void setTotalSlots(int totalSlots) {
        this.totalSlots = totalSlots;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
}
