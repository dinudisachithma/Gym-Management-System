package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import com.gymmanagementsystem.aiproject.service.FitnessClassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
@CrossOrigin(origins = "*")
public class FitnessClassController {

    @Autowired
    private FitnessClassService fitnessClassService;

    @PostMapping
    public ResponseEntity<?> addClass(@RequestBody FitnessClass fitnessClass) {
        try {
            FitnessClass savedClass = fitnessClassService.addClass(fitnessClass);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Class added successfully");
            response.put("fitnessClass", savedClass);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    public ResponseEntity<List<FitnessClass>> getAllClasses() {
        return ResponseEntity.ok(fitnessClassService.getAllClasses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getClass(@PathVariable String id) {
        try {
            FitnessClass fitnessClass = fitnessClassService.getClassById(id);
            return ResponseEntity.ok(fitnessClass);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Class not found");
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClass(@PathVariable String id, @RequestBody FitnessClass classDetails) {
        try {
            FitnessClass updatedClass = fitnessClassService.updateClass(id, classDetails);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Class updated successfully");
            response.put("fitnessClass", updatedClass);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<List<FitnessClass>> getClassesByTrainer(@PathVariable String trainerId) {
        return ResponseEntity.ok(fitnessClassService.getClassesByTrainer(trainerId));
    }

    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<FitnessClass>> getClassesByMember(@PathVariable String memberId) {
        return ResponseEntity.ok(fitnessClassService.getClassesByMember(memberId));
    }

    @PostMapping("/{classId}/assign/{memberId}")
    public ResponseEntity<?> assignMember(@PathVariable String classId, @PathVariable String memberId) {
        try {
            FitnessClass updatedClass = fitnessClassService.assignMemberToClass(classId, memberId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Member assigned successfully");
            response.put("fitnessClass", updatedClass);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{classId}/remove/{memberId}")
    public ResponseEntity<?> removeMember(@PathVariable String classId, @PathVariable String memberId) {
        try {
            FitnessClass updatedClass = fitnessClassService.removeMemberFromClass(classId, memberId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Member removed successfully");
            response.put("fitnessClass", updatedClass);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable String id) {
        try {
            fitnessClassService.deleteClass(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Class deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
