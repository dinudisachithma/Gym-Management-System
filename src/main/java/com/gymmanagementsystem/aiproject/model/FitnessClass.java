package com.gymmanagementsystem.aiproject.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.ElementCollection;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class FitnessClass {
    @Id
    private String classId; // e.g., "CL001"
    private String className; // e.g., "Yoga Session"
    private LocalDateTime schedule;
    @ManyToOne
    private Trainer trainer; // Link to Trainer
    @ElementCollection
    private List<String> assignedMembers = new ArrayList<>(); // List of member IDs (link to User or Member model)
}
