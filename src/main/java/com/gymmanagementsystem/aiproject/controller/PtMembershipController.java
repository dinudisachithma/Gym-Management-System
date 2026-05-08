package com.gymmanagementsystem.aiproject.controller;

import com.gymmanagementsystem.aiproject.model.PtMembership;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import com.gymmanagementsystem.aiproject.repository.PtMembershipRepository;
import com.gymmanagementsystem.aiproject.service.MemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * PT module – Membership Management controller.
 * Belongs to team member's payment tracking feature.
 * Page route : GET /pt-dashboard
 * API routes : /api/pt/memberships/**
 */
@Controller
public class PtMembershipController {

    @Autowired
    private PtMembershipRepository ptRepo;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private MemberService memberService;

    /** Serve the pt-dashboard HTML page */
    @GetMapping("/pt-dashboard")
    public String ptDashboard() {
        return "pt-dashboard";
    }

    /** GET all memberships */
    @GetMapping("/api/pt/memberships")
    @ResponseBody
    public List<PtMembership> getAll() {
        return ptRepo.findAll();
    }

    /** POST - create new membership with auto-incremented memberId */
    @PostMapping("/api/pt/memberships")
    @ResponseBody
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            PtMembership m = new PtMembership();

            // Auto-increment memberId
            Optional<PtMembership> last = ptRepo.findTopByOrderByMemberIdDesc();
            m.setMemberId(last.map(p -> p.getMemberId() + 1).orElse(1));

            m.setMemberName((String) body.getOrDefault("memberName", ""));
            m.setPlanType((String) body.getOrDefault("planType", "Basic"));
            m.setStartDate((String) body.getOrDefault("startDate", ""));
            m.setEndDate((String) body.getOrDefault("endDate", ""));
            Object amt = body.get("amount");
            m.setAmount(amt instanceof Number ? ((Number) amt).doubleValue() : 0.0);
            m.setPaymentStatus((String) body.getOrDefault("paymentStatus", "pending"));
            m.setActive("active".equalsIgnoreCase((String) body.get("paymentStatus")));
            m.setCreatedAt(LocalDateTime.now());

            PtMembership saved = ptRepo.save(m);

            // ── Sync User record when package is created with active status ──
            if ("active".equalsIgnoreCase((String) body.get("paymentStatus"))) {
                String memberName = m.getMemberName();
                // Try to match User by name (case-insensitive)
                memberRepository.findAll().stream()
                    .filter(u -> memberName != null && memberName.equalsIgnoreCase(u.getName()))
                    .findFirst()
                    .ifPresent(user -> {
                        user.setPackageStatus("ACTIVE");
                        user.setMembershipPackage(m.getPlanType());
                        user.setMembershipActivationDate(LocalDateTime.now());
                        memberService.ensureMembershipIdAssigned(user);
                        memberRepository.save(user);
                    });
            }

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    /** PUT - update existing membership */
    @PutMapping("/api/pt/memberships/{id}")
    @ResponseBody
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Optional<PtMembership> optM = ptRepo.findById(id);
        if (optM.isEmpty()) return ResponseEntity.notFound().build();

        PtMembership m = optM.get();
        if (body.containsKey("memberName")) m.setMemberName((String) body.get("memberName"));
        if (body.containsKey("planType"))   m.setPlanType((String) body.get("planType"));
        if (body.containsKey("startDate"))  m.setStartDate((String) body.get("startDate"));
        if (body.containsKey("endDate"))    m.setEndDate((String) body.get("endDate"));
        if (body.containsKey("amount")) {
            Object amt = body.get("amount");
            m.setAmount(amt instanceof Number ? ((Number) amt).doubleValue() : 0.0);
        }
        if (body.containsKey("paymentStatus")) {
            String ps = (String) body.get("paymentStatus");
            m.setPaymentStatus(ps);
            m.setActive("active".equalsIgnoreCase(ps));
        }
        return ResponseEntity.ok(ptRepo.save(m));
    }

    /** PUT - toggle payment status only */
    @PutMapping("/api/pt/memberships/{id}/payment")
    @ResponseBody
    public ResponseEntity<?> updatePayment(@PathVariable String id, @RequestBody Map<String, String> body) {
        Optional<PtMembership> optM = ptRepo.findById(id);
        if (optM.isEmpty()) return ResponseEntity.notFound().build();
        PtMembership m = optM.get();
        String newStatus = body.getOrDefault("paymentStatus", "pending");
        m.setPaymentStatus(newStatus);
        m.setActive("active".equalsIgnoreCase(newStatus));
        return ResponseEntity.ok(ptRepo.save(m));
    }

    /** DELETE - remove membership */
    @DeleteMapping("/api/pt/memberships/{id}")
    @ResponseBody
    public ResponseEntity<?> delete(@PathVariable String id) {
        if (!ptRepo.existsById(id)) return ResponseEntity.notFound().build();
        ptRepo.deleteById(id);
        Map<String, String> r = new HashMap<>();
        r.put("message", "Deleted");
        return ResponseEntity.ok(r);
    }
}
