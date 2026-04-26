package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.FitnessClass;
import com.gymmanagementsystem.aiproject.repository.FitnessClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FitnessClassService {

    @Autowired
    private FitnessClassRepository fitnessClassRepository;

    public FitnessClass addClass(FitnessClass fitnessClass) {
        if (fitnessClass.getMemberIds() == null) {
            fitnessClass.setMemberIds(new java.util.ArrayList<>());
        }
        return fitnessClassRepository.save(fitnessClass);
    }

    public List<FitnessClass> getAllClasses() {
        return fitnessClassRepository.findAll();
    }

    public FitnessClass getClassById(String id) {
        return fitnessClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Class not found"));
    }

    public FitnessClass updateClass(String id, FitnessClass updatedDetails) {
        FitnessClass existingClass = getClassById(id);
        existingClass.setClassName(updatedDetails.getClassName());
        existingClass.setClassDate(updatedDetails.getClassDate());
        existingClass.setClassTime(updatedDetails.getClassTime());
        existingClass.setTrainerId(updatedDetails.getTrainerId());
        existingClass.setTrainerName(updatedDetails.getTrainerName());
        existingClass.setMaxCapacity(updatedDetails.getMaxCapacity());
        return fitnessClassRepository.save(existingClass);
    }

    public List<FitnessClass> getClassesByTrainer(String trainerId) {
        return fitnessClassRepository.findByTrainerId(trainerId);
    }

    public List<FitnessClass> getClassesByMember(String memberId) {
        return fitnessClassRepository.findByMemberIdsContaining(memberId);
    }

    public FitnessClass assignMemberToClass(String classId, String memberId) {
        FitnessClass fitnessClass = getClassById(classId);
        
        if (fitnessClass.getMemberIds() != null && fitnessClass.getMemberIds().contains(memberId)) {
            throw new RuntimeException("Member already assigned to this class");
        }
        
        if (fitnessClass.getMemberIds() != null && fitnessClass.getMaxCapacity() > 0 
                && fitnessClass.getMemberIds().size() >= fitnessClass.getMaxCapacity()) {
            throw new RuntimeException("Class is full");
        }
        
        if (fitnessClass.getMemberIds() == null) {
            fitnessClass.setMemberIds(new java.util.ArrayList<>());
        }
        
        fitnessClass.getMemberIds().add(memberId);
        return fitnessClassRepository.save(fitnessClass);
    }

    public FitnessClass removeMemberFromClass(String classId, String memberId) {
        FitnessClass fitnessClass = getClassById(classId);
        
        if (fitnessClass.getMemberIds() != null && fitnessClass.getMemberIds().contains(memberId)) {
            fitnessClass.getMemberIds().remove(memberId);
            return fitnessClassRepository.save(fitnessClass);
        }
        
        throw new RuntimeException("Member is not assigned to this class");
    }

    public void deleteClass(String id) {
        FitnessClass fitnessClass = getClassById(id);
        fitnessClassRepository.delete(fitnessClass);
    }
}
