package com.gymmanagementsystem.aiproject.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.gymmanagementsystem.aiproject.model.Complaint;
import com.gymmanagementsystem.aiproject.service.ComplaintService;

import java.util.List;

@Controller
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    // View endpoints
    @GetMapping("/complaint-form")
    public String showComplaintForm() {
        return "complaint-form"; // matches complaint-form.html
    }

    @GetMapping("/manage-complaints")
    public String showManageComplaints() {
        return "manage-complaints"; // matches manage-complaints.html
    }

    // API endpoints
    @PostMapping("/api/complaints")
    @ResponseBody
    public ResponseEntity<Complaint> submitComplaint(@RequestBody Complaint complaint) {
        Complaint saved = complaintService.saveComplaint(complaint);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/api/complaints/member/{memberId}")
    @ResponseBody
    public ResponseEntity<List<Complaint>> getMemberComplaints(@PathVariable String memberId) {
        return ResponseEntity.ok(complaintService.getComplaintsByMemberId(memberId));
    }

    @GetMapping("/api/complaints/my")
    @ResponseBody
    public ResponseEntity<List<Complaint>> getMyComplaints(@RequestParam String email) {
        return ResponseEntity.ok(complaintService.getComplaintsByMemberEmail(email));
    }

    @GetMapping("/api/complaints/all")
    @ResponseBody
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @PutMapping("/api/complaints/{id}/reply")
    @ResponseBody
    public ResponseEntity<Complaint> replyToComplaint(@PathVariable String id, @RequestBody Complaint updateRequest) {
        Complaint updated = complaintService.updateComplaintStatus(id, updateRequest.getStatus(), updateRequest.getAdminReply());
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/api/complaints/{id}/view")
    @ResponseBody
    public ResponseEntity<Complaint> markAsViewed(@PathVariable String id) {
        Complaint updated = complaintService.markComplaintInProgress(id);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/api/complaints/{id}/messages")
    @ResponseBody
    public ResponseEntity<Complaint> addMessage(@PathVariable String id, @RequestBody java.util.Map<String, String> payload) {
        String senderRole = payload.get("senderRole");
        String messageText = payload.get("messageText");
        Complaint updated = complaintService.addMessageToComplaint(id, senderRole, messageText);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/api/complaints/{id}/resolve")
    @ResponseBody
    public ResponseEntity<Complaint> resolveComplaint(@PathVariable String id) {
        Complaint updated = complaintService.markComplaintAsResolved(id);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/api/complaints/{id}")
    @ResponseBody
    public ResponseEntity<Void> deleteComplaint(@PathVariable String id) {
        if (complaintService.deleteComplaint(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/api/complaints/{id}")
    @ResponseBody
    public ResponseEntity<Complaint> updatePendingComplaint(@PathVariable String id, @RequestBody Complaint updateRequest) {
        Complaint updated = complaintService.updatePendingComplaint(id, updateRequest);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.badRequest().build();
    }
}
