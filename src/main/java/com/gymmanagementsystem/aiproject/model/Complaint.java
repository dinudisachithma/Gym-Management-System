package com.gymmanagementsystem.aiproject.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Document(collection = "Complaints")
public class Complaint {
    @Id
    private String id;
    
    private String ticketId;

    private String memberName;
    private String memberEmail;
    private String memberId;
    private String category;
    private String description;
    private String status; // "Pending", "In Progress", "Resolved"
    private String adminReply;
    private LocalDateTime submittedAt;
    
    private String priority;
    private String photoBase64;

    private List<ComplaintMessage> messages = new ArrayList<>();

    public Complaint() {
        this.submittedAt = LocalDateTime.now();
        this.status = "Pending";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberEmail() { return memberEmail; }
    public void setMemberEmail(String memberEmail) { this.memberEmail = memberEmail; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminReply() { return adminReply; }
    public void setAdminReply(String adminReply) { this.adminReply = adminReply; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getPhotoBase64() { return photoBase64; }
    public void setPhotoBase64(String photoBase64) { this.photoBase64 = photoBase64; }

    public List<ComplaintMessage> getMessages() { return messages; }
    public void setMessages(List<ComplaintMessage> messages) { this.messages = messages; }

    public static class ComplaintMessage {
        private String senderRole;
        private String message;
        private LocalDateTime timestamp;

        public ComplaintMessage() {
            this.timestamp = LocalDateTime.now();
        }

        public ComplaintMessage(String senderRole, String message) {
            this.senderRole = senderRole;
            this.message = message;
            this.timestamp = LocalDateTime.now();
        }

        public String getSenderRole() { return senderRole; }
        public void setSenderRole(String senderRole) { this.senderRole = senderRole; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    }
}
