package com.gymmanagementsystem.aiproject.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

/**
 * PT module – Membership package created by admin after payment validation.
 * Belongs to team member's payment tracking feature.
 * Collection: pt_memberships (separate from payment_records)
 */
@Document(collection = "pt_memberships")
public class PtMembership {

    @Id
    private String id;

    private int memberId;          // auto-incremented numeric ID
    private String memberName;
    private String planType;       // Basic / Standard / Premium / Custom
    private String startDate;      // YYYY-MM-DD
    private String endDate;        // YYYY-MM-DD
    private double amount;
    private String paymentStatus;  // paid / pending
    private boolean active;
    private LocalDateTime createdAt;

    public PtMembership() {}

    // ── Getters & Setters ──
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getMemberId() { return memberId; }
    public void setMemberId(int memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
