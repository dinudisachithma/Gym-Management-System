package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.MemberPaymentRecord;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberPaymentRepository;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class MemberPaymentService {

    private static final Logger log = LoggerFactory.getLogger(MemberPaymentService.class);

    @Autowired
    private MemberPaymentRepository memberPaymentRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private MemberService memberService;

    /**
     * Submits a direct payment request — saves a PENDING_VALIDATION record.
     * Admin validates this via the admin dashboard to activate the member's membership.
     */
    public MemberPaymentRecord submitPaymentRequest(String email, String packageType, double amount) {
        Optional<User> userOpt = memberRepository.findByEmail(email);
        String userId   = userOpt.map(User::getId).orElse(null);
        String userName = userOpt.map(User::getName).orElse(email);

        MemberPaymentRecord record = new MemberPaymentRecord();
        record.setUserEmail(email);
        record.setUserId(userId);
        record.setUserName(userName);
        record.setPackageType(packageType);
        record.setAmount(amount);
        record.setStripeSessionId(null);
        record.setStripePaymentIntent(null);
        record.setStatus("PENDING_VALIDATION");
        record.setSubmittedAt(LocalDateTime.now());

        MemberPaymentRecord saved = memberPaymentRepository.save(record);
        log.info("Payment request submitted for email={} package={} amount={}", email, packageType, amount);
        return saved;
    }

    /** Returns all payments waiting for admin validation. */
    public List<MemberPaymentRecord> getPendingPayments() {
        return memberPaymentRepository.findByStatus("PENDING_VALIDATION");
    }

    /** Returns all payment records (for admin payment history view). */
    public List<MemberPaymentRecord> getAllPayments() {
        return memberPaymentRepository.findAll();
    }

    /** Admin validates a payment → marks user as PAID (not yet ACTIVE). */
    public MemberPaymentRecord validatePayment(String recordId, String adminNote) {
        MemberPaymentRecord record = memberPaymentRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Payment record not found: " + recordId));

        record.setStatus("VALIDATED");
        record.setValidatedAt(LocalDateTime.now());
        record.setAdminNote(adminNote);
        memberPaymentRepository.save(record);

        // Update user status to PAID — not ACTIVE yet.
        // ACTIVE happens only when admin creates the membership package in pt-dashboard.
        Optional<User> userOpt = memberRepository.findByEmail(record.getUserEmail());
        userOpt.ifPresent(user -> {
            user.setPackageStatus("PAID");
            user.setMembershipPackage(record.getPackageType()); // store selected package type
            memberRepository.save(user);
        });

        return record;
    }

    /** Admin rejects a payment. */
    public MemberPaymentRecord rejectPayment(String recordId, String adminNote) {
        MemberPaymentRecord record = memberPaymentRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Payment record not found: " + recordId));

        record.setStatus("REJECTED");
        record.setValidatedAt(LocalDateTime.now());
        record.setAdminNote(adminNote != null ? adminNote : "Payment rejected by admin");
        memberPaymentRepository.save(record);
        return record;
    }

    /** Returns the latest payment record for the given member email. */
    public Optional<MemberPaymentRecord> getLatestPaymentByEmail(String email) {
        List<MemberPaymentRecord> records = memberPaymentRepository.findByUserEmail(email);
        return records.stream().max(Comparator.comparing(MemberPaymentRecord::getSubmittedAt));
    }

    /** Count of pending payments for the admin notification badge. */
    public long countPendingPayments() {
        return memberPaymentRepository.countByStatus("PENDING_VALIDATION");
    }
}
