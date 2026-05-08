package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.service.TrainerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trainers")
@CrossOrigin(origins = "*")
public class TrainerController {

    @Autowired
    private TrainerService trainerService;

    @PostMapping
    public ResponseEntity<?> addTrainer(@RequestBody User trainer) {
        try {
            Map<String, Object> serviceResult = trainerService.addTrainer(trainer);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Trainer added successfully");
            response.put("trainer", serviceResult.get("trainer"));
            response.put("temporaryPassword", serviceResult.get("temporaryPassword"));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllTrainers() {
        return ResponseEntity.ok(trainerService.getAllTrainers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTrainer(@PathVariable String id) {
        try {
            User trainer = trainerService.getTrainerById(id);
            return ResponseEntity.ok(trainer);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Trainer not found");
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTrainer(@PathVariable String id, @RequestBody User trainerDetails) {
        try {
            User updatedTrainer = trainerService.updateTrainer(id, trainerDetails);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Trainer updated successfully");
            response.put("trainer", updatedTrainer);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTrainer(@PathVariable String id) {
        try {
            trainerService.deleteTrainer(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Trainer deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String id) {
        try {
            String newPassword = trainerService.resetTrainerPassword(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password reset successfully");
            response.put("temporaryPassword", newPassword);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Admin-only: update the public landing page photo (separate from trainer's personal profilePhoto)
    @PatchMapping("/{id}/landing-photo")
    public ResponseEntity<?> updateLandingPhoto(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            String landingPagePhoto = body.get("landingPagePhoto");
            User updated = trainerService.updateLandingPhoto(id, landingPagePhoto);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Landing page photo updated successfully");
            response.put("trainer", updated);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
