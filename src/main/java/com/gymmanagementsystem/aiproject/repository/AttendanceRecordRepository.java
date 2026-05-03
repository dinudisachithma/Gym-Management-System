package com.gymmanagementsystem.aiproject.repository;

import com.gymmanagementsystem.aiproject.model.AttendanceRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends MongoRepository<AttendanceRecord, String> {
    long countByAttendanceDate(LocalDate attendanceDate);
    Optional<AttendanceRecord> findTopByUserIdAndAttendanceDateAndStatusOrderByCheckInTimeDesc(
            String userId, LocalDate attendanceDate, String status
    );
    List<AttendanceRecord> findAllByOrderByCheckInTimeDesc();
}
