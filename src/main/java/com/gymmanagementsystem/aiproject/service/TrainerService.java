package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TrainerService {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public java.util.Map<String, Object> addTrainer(User trainer) {
        if (memberRepository.existsByEmail(trainer.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }
        trainer.setRole("TRAINER");
        
        // Generate T001, T002 sequence for membershipId
        List<User> trainers = memberRepository.findByRole("TRAINER");
        int maxId = 0;
        for (User t : trainers) {
            if (t.getMembershipId() != null && t.getMembershipId().startsWith("T")) {
                try {
                    int num = Integer.parseInt(t.getMembershipId().substring(1));
                    if (num > maxId) maxId = num;
                } catch (Exception e) {}
            }
        }
        String generatedId = String.format("T%03d", maxId + 1);
        trainer.setMembershipId(generatedId);

        // Auto-generate temp password if not provided
        String rawPassword = trainer.getPassword();
        if (rawPassword == null || rawPassword.trim().isEmpty()) {
            rawPassword = "Tr" + (int)(Math.random() * 9000 + 1000);
        }
        
        trainer.setPassword(passwordEncoder.encode(rawPassword));
        
        User savedTrainer = memberRepository.save(trainer);
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("trainer", savedTrainer);
        // We no longer strictly need temporaryPassword, but we can return the raw one
        result.put("temporaryPassword", rawPassword);
        return result;
    }

    public List<User> getAllTrainers() {
        return memberRepository.findByRole("TRAINER");
    }

    public User getTrainerById(String id) {
        return memberRepository.findById(id)
                .filter(u -> "TRAINER".equals(u.getRole()))
                .orElseThrow(() -> new RuntimeException("Trainer not found"));
    }

    public User updateTrainer(String id, User updatedTrainer) {
        User existing = getTrainerById(id);
        
        // update fields
        if (updatedTrainer.getName() != null) existing.setName(updatedTrainer.getName());
        if (updatedTrainer.getEmail() != null) {
            if (!existing.getEmail().equals(updatedTrainer.getEmail()) && memberRepository.existsByEmail(updatedTrainer.getEmail())) {
                throw new RuntimeException("Email is already in use by another account");
            }
            existing.setEmail(updatedTrainer.getEmail());
        }
        if (updatedTrainer.getSpecialization() != null) existing.setSpecialization(updatedTrainer.getSpecialization());
        if (updatedTrainer.getAge() > 0) existing.setAge(updatedTrainer.getAge());
        if (updatedTrainer.getPhone() != null) existing.setPhone(updatedTrainer.getPhone());
        if (updatedTrainer.getCity() != null) existing.setCity(updatedTrainer.getCity());
        if (updatedTrainer.getAddress() != null) existing.setAddress(updatedTrainer.getAddress());
        
        return memberRepository.save(existing);
    }

    public void deleteTrainer(String id) {
        User trainer = getTrainerById(id);
        memberRepository.delete(trainer);
    }

    public User updateLandingPhoto(String id, String landingPagePhoto) {
        User trainer = getTrainerById(id);
        trainer.setLandingPagePhoto(landingPagePhoto);
        return memberRepository.save(trainer);
    }

    public String resetTrainerPassword(String id) {
        User trainer = getTrainerById(id);
        if (trainer.isPasswordChanged()) {
            throw new RuntimeException("Cannot reset password: Trainer has already set their own secure password.");
        }
        String tempPass = "Tr" + (int)(Math.random() * 9000 + 1000); // e.g., Tr4829
        trainer.setPassword(passwordEncoder.encode(tempPass));
        memberRepository.save(trainer);
        return tempPass;
    }
}
