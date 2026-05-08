package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.AttendanceRecord;
import com.gymmanagementsystem.aiproject.service.AttendanceRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceRecordController {

    @Autowired
    private AttendanceRecordService attendanceRecordService;

    @GetMapping
    public ResponseEntity<List<AttendanceRecord>> getAll() {
        return ResponseEntity.ok(attendanceRecordService.getAllRecords());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        return ResponseEntity.ok(attendanceRecordService.getSummary());
    }

    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> notifications() {
        return ResponseEntity.ok(attendanceRecordService.getNotifications());
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, String> body) {
        try {
            String memberId = body.get("memberId");
            AttendanceRecord record = attendanceRecordService.checkIn(memberId);
            Map<String, Object> out = new HashMap<>();
            out.put("message", "Check-in recorded successfully.");
            out.put("record", record);
            return ResponseEntity.ok(out);
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/check-out/{id}")
    public ResponseEntity<?> checkOut(@PathVariable String id) {
        try {
            AttendanceRecord record = attendanceRecordService.checkOut(id);
            Map<String, Object> out = new HashMap<>();
            out.put("message", "Check-out recorded successfully.");
            out.put("record", record);
            return ResponseEntity.ok(out);
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            attendanceRecordService.deleteRecord(id);
            Map<String, String> out = new HashMap<>();
            out.put("message", "Attendance record deleted.");
            return ResponseEntity.ok(out);
        } catch (RuntimeException e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
