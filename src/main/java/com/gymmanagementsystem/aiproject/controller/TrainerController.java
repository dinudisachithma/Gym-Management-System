package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.Trainer;
import com.gymmanagementsystem.aiproject.service.TrainerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trainers")
public class TrainerController {

    @Autowired
    private TrainerService trainerService;

    @PostMapping
    public ResponseEntity<Trainer> createTrainer(@RequestBody Trainer trainer) {
        return ResponseEntity.ok(trainerService.createTrainer(trainer));
    }

    @GetMapping
    public ResponseEntity<List<Trainer>> getAllTrainers() {
        return ResponseEntity.ok(trainerService.getAllTrainers());
    }

    @PutMapping("/{trainerId}")
    public ResponseEntity<Trainer> updateTrainer(@PathVariable String trainerId, @RequestBody Trainer trainer) {
        return ResponseEntity.ok(trainerService.updateTrainer(trainerId, trainer));
    }

    @DeleteMapping("/{trainerId}")
    public ResponseEntity<Void> deleteTrainer(@PathVariable String trainerId) {
        trainerService.deleteTrainer(trainerId);
        return ResponseEntity.noContent().build();
    }
}