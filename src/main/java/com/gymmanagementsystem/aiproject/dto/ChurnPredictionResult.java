package com.gymmanagementsystem.aiproject.dto;

import java.util.List;

public class ChurnPredictionResult {
    private String memberId;
    private String memberName;
    private double probability;
    private String riskLevel;
    private String confidence;
    private List<String> reasons;

    public ChurnPredictionResult(String memberId, String memberName, double probability, String riskLevel, String confidence) {
        this.memberId = memberId;
        this.memberName = memberName;
        this.probability = probability;
        this.riskLevel = riskLevel;
        this.confidence = confidence;
        this.reasons = List.of();
    }

    public ChurnPredictionResult(String memberId, String memberName, double probability, String riskLevel, String confidence, List<String> reasons) {
        this.memberId = memberId;
        this.memberName = memberName;
        this.probability = probability;
        this.riskLevel = riskLevel;
        this.confidence = confidence;
        this.reasons = reasons;
    }

    // Getters and setters
    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public double getProbability() { return probability; }
    public void setProbability(double probability) { this.probability = probability; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public List<String> getReasons() { return reasons; }
    public void setReasons(List<String> reasons) { this.reasons = reasons; }
}