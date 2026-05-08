package com.gymmanagementsystem.aiproject.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

/**
 * AuditLog - Records important system actions for compliance and history tracking
 * Captures: Member deletions, payment rejections, account changes, etc.
 */
@Document(collection = "AuditLogs")
public class AuditLog {
    @Id
    private String id;

    private String action;                      // "MEMBER_DELETED", "PAYMENT_REJECTED", etc.
    private String memberId;                    // Member being affected
    private String memberName;                  // Member name (for readable logs)
    private String memberEmail;                 // Member email
    private String membershipId;                // Associated membership ID
    private String membershipStatus;            // Membership status at time of deletion
    private Double membershipAmount;            // Membership amount
    private LocalDateTime actionTime;           // When action occurred
    private String performedBy;                 // Admin who performed action (email or name)
    private String reason;                      // Why it was done
    private String details;                     // Extra details

    // ── Constructors ──
    public AuditLog() {}

    public AuditLog(String action, String memberId, String memberName, String memberEmail,
                    String membershipId, String membershipStatus, Double membershipAmount,
                    String performedBy, String reason) {
        this.action = action;
        this.memberId = memberId;
        this.memberName = memberName;
        this.memberEmail = memberEmail;
        this.membershipId = membershipId;
        this.membershipStatus = membershipStatus;
        this.membershipAmount = membershipAmount;
        this.actionTime = LocalDateTime.now();
        this.performedBy = performedBy;
        this.reason = reason;
    }

    // ── Getters & Setters ──
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberEmail() { return memberEmail; }
    public void setMemberEmail(String memberEmail) { this.memberEmail = memberEmail; }

    public String getMembershipId() { return membershipId; }
    public void setMembershipId(String membershipId) { this.membershipId = membershipId; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public Double getMembershipAmount() { return membershipAmount; }
    public void setMembershipAmount(Double membershipAmount) { this.membershipAmount = membershipAmount; }

    public LocalDateTime getActionTime() { return actionTime; }
    public void setActionTime(LocalDateTime actionTime) { this.actionTime = actionTime; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}

