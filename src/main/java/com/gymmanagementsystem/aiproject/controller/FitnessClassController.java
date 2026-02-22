package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import com.gymmanagementsystem.aiproject.service.FitnessClassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
public class FitnessClassController {

    @Autowired
    private FitnessClassService fitnessClassService;

    @PostMapping
    public ResponseEntity<FitnessClass> scheduleClass(@RequestBody FitnessClass fitnessClass) {
        return ResponseEntity.ok(fitnessClassService.scheduleClass(fitnessClass));
    }

    @GetMapping
    public ResponseEntity<List<FitnessClass>> getAllClasses() {
        return ResponseEntity.ok(fitnessClassService.getAllClasses());
    }

    @PostMapping("/{classId}/assign/{memberId}")
    public ResponseEntity<FitnessClass> assignMemberToClass(@PathVariable String classId, @PathVariable String memberId) {
        return ResponseEntity.ok(fitnessClassService.assignMemberToClass(classId, memberId));
    }

    @DeleteMapping("/{classId}")
    public ResponseEntity<Void> deleteClass(@PathVariable String classId) {
        fitnessClassService.deleteClass(classId);
        return ResponseEntity.noContent().build();
    }
}