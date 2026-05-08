package com.gymmanagementsystem.aiproject.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.gymmanagementsystem.aiproject.model.Report;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.ReportRepository;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import com.gymmanagementsystem.aiproject.model.AttendanceRecord;
import com.gymmanagementsystem.aiproject.repository.AttendanceRecordRepository;
import com.gymmanagementsystem.aiproject.model.ReportStatsDTO;
import com.gymmanagementsystem.aiproject.dto.ChurnPredictionResult;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ChurnPredictionService churnPredictionService;

    public Report createReport(Report report) {
        report.setCreatedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }
    
    public Report updateReport(String id, Report updatedReport) {
        return reportRepository.findById(id).map(r -> {
            if (updatedReport.getTitle() != null) r.setTitle(updatedReport.getTitle());
            if (updatedReport.getStartDate() != null) r.setStartDate(updatedReport.getStartDate());
            if (updatedReport.getEndDate() != null) r.setEndDate(updatedReport.getEndDate());
            if (updatedReport.getPlanType() != null) r.setPlanType(updatedReport.getPlanType());
            if (updatedReport.getStatus() != null) r.setStatus(updatedReport.getStatus());
            if (updatedReport.getNotes() != null) r.setNotes(updatedReport.getNotes());
            return reportRepository.save(r);
        }).orElseThrow(() -> new RuntimeException("Report not found"));
    }
    
    public void deleteReport(String id) {
        reportRepository.deleteById(id);
    }

    public ReportStatsDTO.AttendanceStats getAttendanceStats() {
        List<AttendanceRecord> allRecords = attendanceRecordRepository.findAll();
        ReportStatsDTO.AttendanceStats stats = new ReportStatsDTO.AttendanceStats();
        stats.totalVisits = allRecords.size();

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<AttendanceRecord> recentRecords = allRecords.stream()
                .filter(r -> r.getCheckInTime() != null && r.getCheckInTime().isAfter(thirtyDaysAgo))
                .collect(Collectors.toList());

        Set<LocalDate> uniqueDays = recentRecords.stream()
                .map(AttendanceRecord::getAttendanceDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        stats.avgDaily = uniqueDays.isEmpty() ? 0 : recentRecords.size() / uniqueDays.size();
        
        stats.todayVisits = allRecords.stream()
                .map(AttendanceRecord::getAttendanceDate)
                .filter(Objects::nonNull)
                .filter(d -> d.equals(LocalDate.now()))
                .count();

        int[] weeklyCounts = new int[7];
        Map<String, List<Integer>> heat = new LinkedHashMap<>();
        String[] timeSlots = {
            "06:00 - 08:00", "08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00",
            "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00", "22:00 - 00:00"
        };
        for (String slot : timeSlots) {
            heat.put(slot, new ArrayList<>(Arrays.asList(0,0,0,0,0,0,0)));
        }

        for (AttendanceRecord r : recentRecords) {
            if (r.getCheckInTime() != null) {
                int dayIndex = r.getCheckInTime().getDayOfWeek().getValue() - 1;
                weeklyCounts[dayIndex]++;

                int hour = r.getCheckInTime().getHour();
                String slot = null;
                if (hour >= 6 && hour < 8) slot = "06:00 - 08:00";
                else if (hour >= 8 && hour < 10) slot = "08:00 - 10:00";
                else if (hour >= 10 && hour < 12) slot = "10:00 - 12:00";
                else if (hour >= 12 && hour < 14) slot = "12:00 - 14:00";
                else if (hour >= 14 && hour < 16) slot = "14:00 - 16:00";
                else if (hour >= 16 && hour < 18) slot = "16:00 - 18:00";
                else if (hour >= 18 && hour < 20) slot = "18:00 - 20:00";
                else if (hour >= 20 && hour < 22) slot = "20:00 - 22:00";
                else if (hour >= 22 && hour < 24) slot = "22:00 - 00:00";

                if (slot != null && heat.containsKey(slot)) {
                    List<Integer> row = heat.get(slot);
                    row.set(dayIndex, row.get(dayIndex) + 1);
                }
            }
        }

        stats.weeklyFootfall = Arrays.stream(weeklyCounts).boxed().collect(Collectors.toList());
        stats.heatmap = heat;

        // Calculate peak hour based on the aggregated slot with most visits
        stats.peakHour = heat.entrySet().stream()
                .filter(e -> e.getValue().stream().mapToInt(Integer::intValue).sum() > 0)
                .max(Comparator.comparingInt(e -> e.getValue().stream().mapToInt(Integer::intValue).sum()))
                .map(Map.Entry::getKey)
                .orElse("N/A");

        return stats;
    }

    public ReportStatsDTO.ChurnStats getChurnStats() {
        ReportStatsDTO.ChurnStats stats = new ReportStatsDTO.ChurnStats();
        try {
            // Get live predictions from ML service
            List<ChurnPredictionResult> predictions = churnPredictionService.getAllChurnPredictions();

            // Debug: log what we're getting
            System.out.println("Total predictions: " + predictions.size());
            predictions.forEach(p -> System.out.println("Member: " + p.getMemberName() + " -> Risk Level: '" + p.getRiskLevel() + "'"));

            // Count members by risk level (case-insensitive)
            long lowRisk = predictions.stream()
                .filter(p -> p.getRiskLevel() != null && p.getRiskLevel().equalsIgnoreCase("Low"))
                .count();
            long mediumRisk = predictions.stream()
                .filter(p -> p.getRiskLevel() != null && p.getRiskLevel().equalsIgnoreCase("Medium"))
                .count();
            long highRisk = predictions.stream()
                .filter(p -> p.getRiskLevel() != null && p.getRiskLevel().equalsIgnoreCase("High"))
                .count();
            
            System.out.println("Low: " + lowRisk + ", Medium: " + mediumRisk + ", High: " + highRisk);
            
            long atRisk = mediumRisk + highRisk;

            // Count members who are inactive: packageStatus is PENDING (payment submitted, not yet activated)
            // Exclude null-status members — those are brand new registrations, not churned members.
            long churned = memberRepository.findByRole("MEMBER").stream()
                .filter(u -> "PENDING".equalsIgnoreCase(u.getPackageStatus()))
                .count();

            // Churn rate as percentage of total members
            long totalMembers = memberRepository.countByRole("MEMBER");
            double rate = totalMembers > 0 ? ((double) churned / totalMembers) * 100 : 0;
            stats.churnRate = String.format("%.1f%%", rate);
            stats.atRiskMembers = (int) atRisk;
            stats.totalChurned = (int) churned;
            stats.lowRiskMembers = (int) lowRisk;
            stats.mediumRiskMembers = (int) mediumRisk;
            stats.highRiskMembers = (int) highRisk;
            stats.trend = new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback if ML service is unreachable
            stats.churnRate = "N/A";
            stats.atRiskMembers = 0;
            stats.totalChurned = 0;
            stats.lowRiskMembers = 0;
            stats.mediumRiskMembers = 0;
            stats.highRiskMembers = 0;
            stats.trend = new ArrayList<>();
        }
        return stats;
    }
}
