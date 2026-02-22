package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import com.gymmanagementsystem.aiproject.repository.FitnessClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FitnessClassServiceImpl implements FitnessClassService {

    @Autowired
    private FitnessClassRepository fitnessClassRepository;

    @Override
    public FitnessClass scheduleClass(FitnessClass fitnessClass) {
        return fitnessClassRepository.save(fitnessClass);
    }

    @Override
    public List<FitnessClass> getAllClasses() {
        return fitnessClassRepository.findAll();
    }

    @Override
    public FitnessClass assignMemberToClass(String classId, String memberId) {
        FitnessClass fitnessClass = fitnessClassRepository.findById(classId).orElseThrow(() -> new RuntimeException("Class not found"));
        fitnessClass.getAssignedMembers().add(memberId);
        return fitnessClassRepository.save(fitnessClass);
    }

    @Override
    public void deleteClass(String classId) {
        fitnessClassRepository.deleteById(classId);
    }
}
