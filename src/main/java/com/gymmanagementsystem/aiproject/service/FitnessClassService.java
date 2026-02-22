package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.FitnessClass;

import java.util.List;

public interface FitnessClassService {
    FitnessClass scheduleClass(FitnessClass fitnessClass);
    List<FitnessClass> getAllClasses();
    FitnessClass assignMemberToClass(String classId, String memberId);
    void deleteClass(String classId);
}
