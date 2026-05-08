package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.dto.MemberLoginDto;
import com.gymmanagementsystem.aiproject.dto.MemberRegistrationDto;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.model.AuditLog;
import com.gymmanagementsystem.aiproject.model.PtMembership;
import com.gymmanagementsystem.aiproject.service.MemberService;
import com.gymmanagementsystem.aiproject.repository.AuditLogRepository;
import com.gymmanagementsystem.aiproject.repository.PtMembershipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class MemberController {

    @Autowired
    private MemberService memberService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PtMembershipRepository ptMembershipRepository;

    @Value("${app.admin-key:}")
    private String configuredAdminKey;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody MemberRegistrationDto registrationDto) {
        try {
            User User = memberService.registerUser(registrationDto);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("user", User);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody MemberLoginDto loginDto) {
        try {
            User User = memberService.loginUser(loginDto.getEmail(), loginDto.getPassword());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("user", User);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/members")
    public ResponseEntity<List<User>> getAllMembers() {
        List<User> members = memberService.getAllMembers();
        return ResponseEntity.ok(members);
    }

    @GetMapping("/members/{id}")
    public ResponseEntity<?> getMember(@PathVariable String id) {
        try {
            User User = memberService.findById(id);
            return ResponseEntity.ok(User);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Member not found");
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/members/{id}")
    public ResponseEntity<?> deleteMember(@PathVariable String id) {
        try {
            // Find the member first
            User member = memberService.findById(id);

            // Find and delete associated membership (cascade delete)
            PtMembership membership = ptMembershipRepository.findByMemberName(member.getName()).orElse(null);

            // Create audit log entry before deletion
            AuditLog auditLog = new AuditLog(
                "MEMBER_DELETED",
                member.getId(),
                member.getName(),
                member.getEmail(),
                membership != null ? membership.getId() : null,
                membership != null ? membership.getPaymentStatus() : "N/A",
                membership != null ? membership.getAmount() : 0.0,
                "ADMIN",
                "Admin deletion via dashboard"
            );
            auditLogRepository.save(auditLog);

            // Delete membership if exists
            if (membership != null) {
                ptMembershipRepository.delete(membership);
            }

            // Delete member account
            memberService.deleteMember(id);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Member and associated membership deleted successfully");
            response.put("auditLogId", auditLog.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/members/{id}")
    public ResponseEntity<?> updateMember(@PathVariable String id, @RequestBody User User) {
        try {
            User updatedUser = memberService.updateProfile(id, User);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/members/{id}/request-delete")
    public ResponseEntity<?> requestDelete(@PathVariable String id) {
        try {
            memberService.requestDelete(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/request-delete")
    public ResponseEntity<?> requestDeleteByEmail(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "email is required");
                return ResponseEntity.badRequest().body(err);
            }
            memberService.requestDeleteByEmail(email);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/deletion-requests")
    public ResponseEntity<List<User>> getDeletionRequests() {
        List<User> requests = memberService.getDeleteRequests();
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/approve-delete/{id}")
    public ResponseEntity<?> approveDelete(@PathVariable String id) {
        try {
            // Find the member first
            User member = memberService.findById(id);

            // Find and delete associated membership (cascade delete)
            PtMembership membership = ptMembershipRepository.findByMemberName(member.getName()).orElse(null);

            // Create audit log entry before deletion
            AuditLog auditLog = new AuditLog(
                "MEMBER_DELETED",
                member.getId(),
                member.getName(),
                member.getEmail(),
                membership != null ? membership.getId() : null,
                membership != null ? membership.getPaymentStatus() : "N/A",
                membership != null ? membership.getAmount() : 0.0,
                "ADMIN",
                "Deletion request approved"
            );
            auditLogRepository.save(auditLog);

            // Delete membership if exists
            if (membership != null) {
                ptMembershipRepository.delete(membership);
            }

            // Delete member account
            memberService.approveDeleteRequest(id);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Member and associated membership deleted successfully");
            response.put("auditLogId", auditLog.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/deny-delete/{id}")
    public ResponseEntity<?> denyDelete(@PathVariable String id) {
        try {
            memberService.denyDeleteRequest(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body) {
        try {
            String id = body.get("id") != null ? body.get("id").toString() : null;
            String currentPassword = (String) body.get("currentPassword");
            String newPassword = (String) body.get("newPassword");
            if (id == null || currentPassword == null || newPassword == null) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "id, currentPassword and newPassword are required");
                return ResponseEntity.badRequest().body(err);
            }
            memberService.changePassword(id, currentPassword, newPassword);
            Map<String, String> ok = new HashMap<>();
            ok.put("message", "Password changed successfully");
            return ResponseEntity.ok(ok);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Payment callback: activates member's membership after payment validation.
     * Protected by X-Admin-Key header.
     */
    @PostMapping("/payment-callback")
    public ResponseEntity<?> paymentCallback(@RequestBody Map<String, Object> payload,
                                             @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        try {
            if (configuredAdminKey == null || configuredAdminKey.isBlank()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Server admin key not configured");
                return ResponseEntity.status(500).body(err);
            }
            if (adminKey == null || !configuredAdminKey.equals(adminKey)) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Unauthorized: missing or invalid admin key");
                return ResponseEntity.status(403).body(err);
            }

            String email = (String) payload.get("email");
            String packageType = (String) payload.get("packageType");
            Boolean success = payload.get("success") instanceof Boolean
                    ? (Boolean) payload.get("success")
                    : "true".equalsIgnoreCase(String.valueOf(payload.get("success")));

            if (email == null || email.isBlank() || packageType == null || packageType.isBlank()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "email and packageType are required");
                return ResponseEntity.badRequest().body(err);
            }
            if (!Boolean.TRUE.equals(success)) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Payment not successful");
                return ResponseEntity.badRequest().body(err);
            }

            User User = memberService.activateMembership(email, packageType);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Membership activated");
            response.put("user", User);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}


