package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.AttendanceRecord;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.AttendanceRecordRepository;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AttendanceRecordService {

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private MemberRepository memberRepository;

    public AttendanceRecord checkIn(String inputMemberId) {
        String memberId = normalizeMemberId(inputMemberId);
        User user = memberRepository.findByMembershipIdIgnoreCase(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found for ID: " + inputMemberId));
        if (!"ACTIVE".equalsIgnoreCase(user.getPackageStatus())) {
            throw new RuntimeException("Only ACTIVE members can check in.");
        }

        LocalDate today = LocalDate.now();
        Optional<AttendanceRecord> existingActive = attendanceRecordRepository
                .findTopByUserIdAndAttendanceDateAndStatusOrderByCheckInTimeDesc(user.getId(), today, "ACTIVE");
        if (existingActive.isPresent()) {
            throw new RuntimeException("Member is already checked in.");
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setUserId(user.getId());
        record.setMemberName(user.getName());
        record.setMemberEmail(user.getEmail());
        record.setMembershipId(user.getMembershipId());
        record.setAttendanceDate(today);
        record.setCheckInTime(LocalDateTime.now());
        record.setStatus("ACTIVE");
        record.setCreatedAt(LocalDateTime.now());
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return saved;
    }

    public AttendanceRecord checkOut(String recordId) {
        AttendanceRecord record = attendanceRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        if (!"ACTIVE".equalsIgnoreCase(record.getStatus())) {
            throw new RuntimeException("Member is already checked out.");
        }
        record.setCheckOutTime(LocalDateTime.now());
        record.setStatus("CHECKED_OUT");
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return saved;
    }

    public List<AttendanceRecord> getAllRecords() {
        return attendanceRecordRepository.findAllByOrderByCheckInTimeDesc();
    }

    public void deleteRecord(String recordId) {
        if (!attendanceRecordRepository.existsById(recordId)) {
            throw new RuntimeException("Attendance record not found");
        }
        attendanceRecordRepository.deleteById(recordId);
    }

    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        long todayCount = attendanceRecordRepository.countByAttendanceDate(LocalDate.now());
        long totalCount = attendanceRecordRepository.count();
        summary.put("todayCheckIns", todayCount);
        summary.put("totalRecords", totalCount);
        return summary;
    }

    public Map<String, Object> getNotifications() {
        Map<String, Object> out = new HashMap<>();
        long activeCount = attendanceRecordRepository.findAllByOrderByCheckInTimeDesc()
                .stream()
                .filter(r -> "ACTIVE".equalsIgnoreCase(r.getStatus()))
                .count();
        out.put("activeMembersInside", activeCount);
        out.put("message", activeCount > 0
                ? activeCount + " member(s) are currently active in gym."
                : "No active members currently inside.");
        return out;
    }

    private String normalizeMemberId(String inputMemberId) {
        if (inputMemberId == null || inputMemberId.isBlank()) {
            throw new RuntimeException("Member ID is required.");
        }
        String cleaned = inputMemberId.trim().toUpperCase();
        if (cleaned.startsWith("GYM-")) {
            return cleaned;
        }
        if (cleaned.matches("^M\\d{3}$")) {
            return "GYM-" + cleaned.substring(1);
        }
        if (cleaned.matches("^\\d{3}$")) {
            return "GYM-" + cleaned;
        }
        return cleaned;
    }
}
