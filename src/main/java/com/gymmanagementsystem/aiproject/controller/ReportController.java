package com.gymmanagementsystem.aiproject.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import com.gymmanagementsystem.aiproject.service.ChurnPredictionService;
import com.gymmanagementsystem.aiproject.service.ReportService;
import com.gymmanagementsystem.aiproject.dto.ChurnPredictionResult;
import com.gymmanagementsystem.aiproject.model.Report;

import java.util.List;

@Controller
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private ChurnPredictionService churnPredictionService;

    // View mappings
    @GetMapping("/report-admin-dashboard")
    public String showReportDashboard() {
        return "report-admin-dashboard";
    }


    @GetMapping("/report-membership")
    public String showMembershipReports() {
        return "report-membership";
    }

    // API endpoints
    @PostMapping("/api/reports")
    @ResponseBody
    public ResponseEntity<Report> createReport(@RequestBody Report report) {
        Report savedReport = reportService.createReport(report);
        return ResponseEntity.ok(savedReport);
    }

    @GetMapping("/api/reports")
    @ResponseBody
    public ResponseEntity<List<Report>> getAllReports() {
        List<Report> reports = reportService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    @PutMapping("/api/reports/{id}")
    @ResponseBody
    public ResponseEntity<?> updateReport(@PathVariable String id, @RequestBody Report updatedReport) {
        try {
            Report report = reportService.updateReport(id, updatedReport);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/api/reports/{id}")
    @ResponseBody
    public ResponseEntity<?> deleteReport(@PathVariable String id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/reports/stats/attendance")
    @ResponseBody
    public ResponseEntity<?> getAttendanceStats() {
        return ResponseEntity.ok(reportService.getAttendanceStats());
    }

    @GetMapping("/api/reports/stats/churn")
    @ResponseBody
    public ResponseEntity<?> getChurnStats() {
        return ResponseEntity.ok(reportService.getChurnStats());
    }

    @GetMapping("/api/churn/predictions")
    @ResponseBody
    public ResponseEntity<List<ChurnPredictionResult>> getChurnPredictions() {
        List<ChurnPredictionResult> predictions = churnPredictionService.getAllChurnPredictions();
        return ResponseEntity.ok(predictions);
    }
}
