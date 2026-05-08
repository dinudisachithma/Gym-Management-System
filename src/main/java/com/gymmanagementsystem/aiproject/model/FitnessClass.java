package com.gymmanagementsystem.aiproject.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "FitnessClasses")
public class FitnessClass {
    @Id
    private String id;
    
    private String className;
    private String classDate; // can be "Today", "Monday", or actual date string
    private String classTime;
    private String trainerName; // Displayed trainer name
    private String trainerId; // The ID of the User with role TRAINER
    private int maxCapacity;
    
    // To track assigned members
    private List<String> memberIds = new ArrayList<>();

    public FitnessClass() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getClassDate() { return classDate; }
    public void setClassDate(String classDate) { this.classDate = classDate; }

    public String getClassTime() { return classTime; }
    public void setClassTime(String classTime) { this.classTime = classTime; }

    public String getTrainerName() { return trainerName; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }

    public String getTrainerId() { return trainerId; }
    public void setTrainerId(String trainerId) { this.trainerId = trainerId; }

    public int getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(int maxCapacity) { this.maxCapacity = maxCapacity; }

    public List<String> getMemberIds() { return memberIds; }
    public void setMemberIds(List<String> memberIds) { this.memberIds = memberIds; }
    
    public int getCurrentCapacity() {
        return memberIds != null ? memberIds.size() : 0;
    }
}
