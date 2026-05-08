package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.MemberPaymentRecord;
import com.gymmanagementsystem.aiproject.service.MemberPaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class MemberPaymentController {

    @Autowired
    private MemberPaymentService memberPaymentService;

    /** Member submits a membership payment request. */
    @PostMapping("/submit")
    public ResponseEntity<?> submitPayment(@RequestBody Map<String, Object> body) {
        try {
            String email       = (String) body.get("email");
            String packageType = (String) body.get("packageType");
            double amount      = body.get("amount") instanceof Number
                    ? ((Number) body.get("amount")).doubleValue() : 0.0;

            if (email == null || packageType == null || amount <= 0) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "email, packageType and amount are required");
                return ResponseEntity.badRequest().body(err);
            }

            MemberPaymentRecord record = memberPaymentService.submitPaymentRequest(email, packageType, amount);
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Payment request submitted. Awaiting admin approval.");
            resp.put("record", record);
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    /** Admin: get all PENDING_VALIDATION payments. */
    @GetMapping("/pending")
    public ResponseEntity<List<MemberPaymentRecord>> getPending() {
        return ResponseEntity.ok(memberPaymentService.getPendingPayments());
    }

    /** Admin: get all payment records (history). */
    @GetMapping("/all")
    public ResponseEntity<List<MemberPaymentRecord>> getAll() {
        return ResponseEntity.ok(memberPaymentService.getAllPayments());
    }

    /** Admin: validate a payment → activates member. */
    @PostMapping("/validate/{id}")
    public ResponseEntity<?> validate(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.getOrDefault("adminNote", "Payment validated by admin") : "Payment validated by admin";
            MemberPaymentRecord record = memberPaymentService.validatePayment(id, note);
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Payment validated. Member is now ACTIVE.");
            resp.put("record", record);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** Admin: reject a payment. */
    @PostMapping("/reject/{id}")
    public ResponseEntity<?> reject(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.getOrDefault("adminNote", "Payment rejected by admin") : "Payment rejected by admin";
            MemberPaymentRecord record = memberPaymentService.rejectPayment(id, note);
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Payment rejected.");
            resp.put("record", record);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** Member: get their latest payment status. */
    @GetMapping("/my-status")
    public ResponseEntity<?> myStatus(@RequestParam String email) {
        Optional<MemberPaymentRecord> record = memberPaymentService.getLatestPaymentByEmail(email);
        if (record.isPresent()) {
            return ResponseEntity.ok(record.get());
        } else {
            Map<String, String> resp = new HashMap<>();
            resp.put("status", "NONE");
            return ResponseEntity.ok(resp);
        }
    }

    /** Admin: get count of pending payments (for notification badge). */
    @GetMapping("/pending-count")
    public ResponseEntity<?> pendingCount() {
        Map<String, Long> resp = new HashMap<>();
        resp.put("count", memberPaymentService.countPendingPayments());
        return ResponseEntity.ok(resp);
    }
}
