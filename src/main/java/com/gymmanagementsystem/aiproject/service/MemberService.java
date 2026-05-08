package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.dto.MemberRegistrationDto;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MemberService {
    private static final Pattern MEMBERSHIP_ID_PATTERN = Pattern.compile("^GYM-(\\d+)$");
    private static final Pattern MEMBER_NO_PATTERN = Pattern.compile("^M-(\\d+)$");

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User registerUser(MemberRegistrationDto registrationDto) {
        if (memberRepository.existsByEmail(registrationDto.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        User user = new User();
        user.setName(registrationDto.getFullName());
        user.setEmail(registrationDto.getEmail());
        user.setPassword(passwordEncoder.encode(registrationDto.getPassword()));
        user.setGender(registrationDto.getGender());
        user.setAge(registrationDto.getAge());
        user.setCity(registrationDto.getCity());
        user.setPhone(registrationDto.getPhone());
        user.setAddress(registrationDto.getAddress() != null ? registrationDto.getAddress() : "");
        user.setRole("MEMBER");
        user.setDeleteRequestStatus("NONE");
        user.setPackageStatus("PENDING");
        user.setMembershipPackage(null);
        user.setMembershipActivationDate(null);
        ensureMemberNoAssigned(user);
        return memberRepository.save(user);
    }

    public User registerUser(User user) {
        if (memberRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        if (user.getPassword() != null && !user.getPassword().startsWith("$2a$")) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        ensureMemberNoAssigned(user);
        return memberRepository.save(user);
    }

    public User loginUser(String email, String password) {
        User user = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }
        
        // Retrofit M-XXX assignment for existing users on login
        if (user.getMemberNo() == null || user.getMemberNo().isBlank()) {
            ensureMemberNoAssigned(user);
            memberRepository.save(user);
        }
        
        return user;
    }

    public User findById(String id) {
        return memberRepository.findById(id).orElseThrow();
    }

    public User updateProfile(String id, User updatedUser) {
        User user = findById(id);
        user.setName(updatedUser.getName());
        user.setEmail(updatedUser.getEmail());
        user.setPhone(updatedUser.getPhone());
        user.setCity(updatedUser.getCity());
        user.setAge(updatedUser.getAge());
        user.setGender(updatedUser.getGender());
        if (updatedUser.getAddress() != null) {
            user.setAddress(updatedUser.getAddress());
        }
        if (updatedUser.getProfilePhoto() != null) {
            user.setProfilePhoto(updatedUser.getProfilePhoto());
        }
        return memberRepository.save(user);
    }

    public void changePassword(String id, String currentPassword, String newPassword) {
        User user = findById(id);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChanged(true);
        memberRepository.save(user);
    }

    public void requestDelete(String id) {
        User user = findById(id);
        user.setDeleteRequestStatus("PENDING");
        memberRepository.save(user);
    }

    public void requestDeleteByEmail(String email) {
        User user = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        user.setDeleteRequestStatus("PENDING");
        memberRepository.save(user);
    }

    // ✅ Admin Functions — only return MEMBER role users
    public List<User> getAllMembers() {
        return memberRepository.findByRole("MEMBER");
    }

    public List<User> getDeleteRequests() {
        return memberRepository.findByDeleteRequestStatusAndRole("PENDING", "MEMBER");
    }

    public void deleteMember(String id) {
        memberRepository.deleteById(id);
    }

    public void approveDeleteRequest(String id) {
        memberRepository.deleteById(id);
    }

    public void denyDeleteRequest(String id) {
        User user = findById(id);
        user.setDeleteRequestStatus("NONE");
        memberRepository.save(user);
    }

    public User activateMembership(String email, String packageType) {
        User user = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        user.setPackageStatus("ACTIVE");
        user.setMembershipPackage(packageType);
        LocalDateTime now = LocalDateTime.now();
        user.setMembershipActivationDate(now);

        // Calculate expiry date based on package type
        Map<String, Integer> packageDays = new HashMap<>(Map.of(
            "monthly",   30,
            "quarterly", 91,
            "annually",  365
        ));
        int durationDays = packageDays.getOrDefault(packageType.toLowerCase(), 30);
        user.setMembershipExpiryDate(now.plusDays(durationDays));

        ensureMembershipIdAssigned(user);
        return memberRepository.save(user);
    }

    /**
     * Assign a unique business membership ID if not already assigned.
     * The ID is stable and should never be changed once generated.
     */
    public void ensureMembershipIdAssigned(User user) {
        if (user.getMembershipId() != null && !user.getMembershipId().isBlank()) {
            return;
        }
        int nextNumber = memberRepository.findByRole("MEMBER").stream()
                .map(User::getMembershipId)
                .filter(id -> id != null && !id.isBlank())
                .mapToInt(this::extractMembershipNumber)
                .max()
                .orElse(0) + 1;

        String candidate = formatMembershipId(nextNumber);
        while (memberRepository.existsByMembershipIdIgnoreCase(candidate)) {
            nextNumber++;
            candidate = formatMembershipId(nextNumber);
        }
        user.setMembershipId(candidate);
    }

    private int extractMembershipNumber(String membershipId) {
        Matcher matcher = MEMBERSHIP_ID_PATTERN.matcher(membershipId.trim().toUpperCase());
        if (!matcher.matches()) {
            return 0;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String formatMembershipId(int number) {
        return "GYM-" + String.format("%03d", number);
    }

    public void ensureMemberNoAssigned(User user) {
        if (user.getMemberNo() != null && !user.getMemberNo().isBlank()) {
            return;
        }
        int nextNumber = memberRepository.findByRole("MEMBER").stream()
                .map(User::getMemberNo)
                .filter(id -> id != null && !id.isBlank())
                .mapToInt(this::extractMemberNumber)
                .max()
                .orElse(0) + 1;

        String candidate = formatMemberNo(nextNumber);
        while (memberRepository.existsByMemberNoIgnoreCase(candidate)) {
            nextNumber++;
            candidate = formatMemberNo(nextNumber);
        }
        user.setMemberNo(candidate);
    }

    private int extractMemberNumber(String memberNo) {
        Matcher matcher = MEMBER_NO_PATTERN.matcher(memberNo.trim().toUpperCase());
        if (!matcher.matches()) {
            return 0;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String formatMemberNo(int number) {
        return "M-" + String.format("%03d", number);
    }
}
