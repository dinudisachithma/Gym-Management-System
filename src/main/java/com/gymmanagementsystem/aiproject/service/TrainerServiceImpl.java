package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.Trainer;
import com.gymmanagementsystem.aiproject.repository.TrainerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TrainerServiceImpl implements TrainerService {

    @Autowired
    private TrainerRepository trainerRepository;

    @Override
    public Trainer createTrainer(Trainer trainer) {
        return trainerRepository.save(trainer);
    }

    @Override
    public List<Trainer> getAllTrainers() {
        return trainerRepository.findAll();
    }

    @Override
    public Trainer updateTrainer(String trainerId, Trainer trainer) {
        Trainer existing = trainerRepository.findById(trainerId).orElseThrow(() -> new RuntimeException("Trainer not found"));
        existing.setName(trainer.getName());
        existing.setSpecialization(trainer.getSpecialization());
        existing.setPhoneNumber(trainer.getPhoneNumber());
        existing.setEmail(trainer.getEmail());
        return trainerRepository.save(existing);
    }

    @Override
    public void deleteTrainer(String trainerId) {
        trainerRepository.deleteById(trainerId);
    }
}