package com.gymmanagementsystem.aiproject.config;

import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initAdmin(MemberRepository memberRepository) {
        return args -> {
            // Only create admin if no admin account exists yet
            boolean adminExists = memberRepository.findByEmail("admin@gym.com").isPresent();
            if (!adminExists) {
                User admin = new User();
                admin.setName("Admin");
                admin.setEmail("admin@gym.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                admin.setGender("N/A");
                admin.setAge(0);
                admin.setCity("N/A");
                admin.setPhone("N/A");
                admin.setAddress("");
                admin.setPackageStatus("NONE");
                admin.setDeleteRequestStatus("NONE");
                memberRepository.save(admin);
                System.out.println("✅ Admin account created: admin@gym.com / admin123");
            } else {
                System.out.println("✅ Admin account already exists.");
            }
        };
    }
}


