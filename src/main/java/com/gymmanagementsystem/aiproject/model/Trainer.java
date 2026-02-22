package com.gymmanagementsystem.aiproject.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class Trainer {
    @Id
    private String trainerId; // e.g., "TR001"
    private String name;
    private String specialization; // e.g., "Yoga"
    private String phoneNumber;
    private String email;
}