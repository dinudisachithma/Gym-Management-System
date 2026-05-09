package com.gymmanagementsystem.aiproject.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "Feedback")
public class Feedback {
    @Id
    private String id;
    
    // Submitter Info
    private String memberId;
    private String memberName;
    private String memberProfilePhoto; // snapshot of photo at submission time (Base64)
    private boolean isAnonymous;

    // Target Info
    private String targetType; // "GYM" or "TRAINER"
    private String trainerId;  // Nullable if "GYM"
    private String trainerName; // Denormalized for display

    // Feedback Content
    private int rating; // 1 to 5
    private String comment;
    
    // Admin Controls
    private boolean isApproved;
    private LocalDateTime createdAt;

    // Getters
    public String getId() { return id; }
    public String getMemberId() { return memberId; }
    public String getMemberName() { return memberName; }
    public String getMemberProfilePhoto() { return memberProfilePhoto; }
    public boolean isAnonymous() { return isAnonymous; }
    public String getTargetType() { return targetType; }
    public String getTrainerId() { return trainerId; }
    public String getTrainerName() { return trainerName; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
    public boolean isApproved() { return isApproved; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setMemberId(String memberId) { this.memberId = memberId; }
    public void setMemberName(String memberName) { this.memberName = memberName; }
    public void setMemberProfilePhoto(String memberProfilePhoto) { this.memberProfilePhoto = memberProfilePhoto; }
    public void setAnonymous(boolean anonymous) { isAnonymous = anonymous; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public void setTrainerId(String trainerId) { this.trainerId = trainerId; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }
    public void setRating(int rating) { this.rating = rating; }
    public void setComment(String comment) { this.comment = comment; }
    public void setApproved(boolean approved) { isApproved = approved; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
