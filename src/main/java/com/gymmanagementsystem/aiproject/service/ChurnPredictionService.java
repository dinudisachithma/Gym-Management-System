package com.gymmanagementsystem.aiproject.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import com.gymmanagementsystem.aiproject.dto.ChurnPredictionResult;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.AttendanceRecordRepository;
import com.gymmanagementsystem.aiproject.repository.MemberPaymentRepository;
import com.gymmanagementsystem.aiproject.repository.FeedbackRepository;
import com.gymmanagementsystem.aiproject.repository.ComplaintRepository;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import com.gymmanagementsystem.aiproject.model.AttendanceRecord;
import com.gymmanagementsystem.aiproject.model.MemberPaymentRecord;
import com.gymmanagementsystem.aiproject.model.Feedback;
import com.gymmanagementsystem.aiproject.model.Complaint;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChurnPredictionService {

    @Autowired private MemberRepository memberRepository;
    @Autowired private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired private MemberPaymentRepository memberPaymentRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private ComplaintRepository complaintRepository;

    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:5000}")
    private String mlServiceUrl;

    public ChurnPredictionService() {
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(5000);
        rf.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(rf);
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Returns churn predictions for all members who have EVER been activated.
     * Includes currently active members AND members whose membership has expired
     * (they didn't renew = real churn candidates).
     * Excludes members who registered but never paid (no activation date).
     */
    public List<ChurnPredictionResult> getAllChurnPredictions() {
        List<User> members = memberRepository.findByRole("MEMBER").stream()
                .filter(u -> u.getMembershipActivationDate() != null)
                .collect(Collectors.toList());

        // Load all collections ONCE — avoids N×4 full DB scans
        List<AttendanceRecord>    allAttendance = attendanceRecordRepository.findAll();
        List<MemberPaymentRecord> allPayments   = memberPaymentRepository.findAll();
        List<Feedback>            allFeedbacks  = feedbackRepository.findAll();
        List<Complaint>           allComplaints = complaintRepository.findAll();

        boolean mlAvailable = isMlServiceAvailable();

        return members.stream()
                .map(member -> {
                    Map<String, Object> features = extractFeatures(
                            member, allAttendance, allPayments, allFeedbacks, allComplaints);
                    return mlAvailable
                            ? predictWithMlModel(member, features)
                            : createFallbackPrediction(member, features);
                })
                .sorted((a, b) -> Double.compare(b.getProbability(), a.getProbability()))
                .collect(Collectors.toList());
    }

    /** Single-member prediction (loads data on-demand). */
    public ChurnPredictionResult predictChurn(User member) {
        List<AttendanceRecord>    allAttendance = attendanceRecordRepository.findAll();
        List<MemberPaymentRecord> allPayments   = memberPaymentRepository.findAll();
        List<Feedback>            allFeedbacks  = feedbackRepository.findAll();
        List<Complaint>           allComplaints = complaintRepository.findAll();
        Map<String, Object> features = extractFeatures(
                member, allAttendance, allPayments, allFeedbacks, allComplaints);
        return predictWithMlModel(member, features);
    }

    // =========================================================================
    // ML call
    // =========================================================================

    private ChurnPredictionResult predictWithMlModel(User member, Map<String, Object> features) {
        try {
            // Send ONLY the 6 numeric features the trained model expects
            Map<String, Object> modelInput = new LinkedHashMap<>();
            modelInput.put("membership_duration_days", features.get("membership_duration_days"));
            modelInput.put("total_visits",             features.get("total_visits"));
            modelInput.put("days_since_last_visit",    features.get("days_since_last_visit"));
            modelInput.put("payment_delays",           features.get("payment_delays"));
            modelInput.put("average_session_duration", features.get("average_session_duration"));
            modelInput.put("feedback_score",           features.get("feedback_score"));

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    mlServiceUrl + "/predict", modelInput, Map.class);

            Map<String, Object> result    = response.getBody();
            double probability = ((Number) result.get("churn_probability")).doubleValue();
            String riskLevel   = (String)  result.get("risk_level");

            return new ChurnPredictionResult(
                    member.getId(), member.getName(), probability, riskLevel,
                    (String) result.get("confidence"),
                    buildReasons(features, riskLevel, probability));

        } catch (RestClientException e) {
            return createFallbackPrediction(member, features);
        }
    }

    private boolean isMlServiceAvailable() {
        try {
            return restTemplate.getForEntity(mlServiceUrl + "/health", String.class)
                    .getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }

    // =========================================================================
    // Rule-based fallback (when ML service is offline)
    // =========================================================================

    private ChurnPredictionResult createFallbackPrediction(User member, Map<String, Object> features) {
        int     totalVisits       = (int)     features.get("total_visits");
        int     daysSinceLast     = (int)     features.get("days_since_last_visit");
        int     paymentDelays     = (int)     features.get("payment_delays");
        double  avgSession        = (double)  features.get("average_session_duration");
        double  feedbackScore     = (double)  features.get("feedback_score");
        boolean membershipExpired = (boolean) features.get("membership_expired");

        double score = 0.0;
        if (daysSinceLast >= 999) score += 0.35;
        else if (daysSinceLast > 30) score += 0.25;
        else if (daysSinceLast > 14) score += 0.10;

        if (totalVisits == 0) score += 0.20;
        else if (totalVisits < 5) score += 0.10;

        if (avgSession == 0.0) score += 0.15;

        if (feedbackScore < 2.5)      score += 0.15;
        else if (feedbackScore < 3.5) score += 0.05;

        score += paymentDelays * 0.10;
        if (membershipExpired) score += 0.20;
        score = Math.min(score, 0.95);

        String riskLevel = score >= 0.7 ? "High" : score >= 0.3 ? "Medium" : "Low";
        List<String> reasons = buildReasons(features, riskLevel, score);
        reasons.add(1, "⚠️ Note: AI model offline — this is a rule-based estimate");

        return new ChurnPredictionResult(
                member.getId(), member.getName(), score, riskLevel, "low", reasons);
    }

    // =========================================================================
    // Feature extraction
    // =========================================================================

    private Map<String, Object> extractFeatures(User member,
                                                 List<AttendanceRecord>    allAttendance,
                                                 List<MemberPaymentRecord> allPayments,
                                                 List<Feedback>            allFeedbacks,
                                                 List<Complaint>           allComplaints) {
        Map<String, Object> f = new LinkedHashMap<>();

        // ── 6 features sent to the ML model ──────────────────────────────────

        long membershipDays = member.getMembershipActivationDate() == null ? 0
                : ChronoUnit.DAYS.between(member.getMembershipActivationDate().toLocalDate(), LocalDate.now());
        f.put("membership_duration_days", membershipDays);

        List<AttendanceRecord> memberAttendance = allAttendance.stream()
                .filter(r -> member.getId().equals(r.getUserId()))
                .toList();

        f.put("total_visits", memberAttendance.size());

        int daysSinceLast = memberAttendance.stream()
                .filter(r -> r.getAttendanceDate() != null)
                .map(AttendanceRecord::getAttendanceDate)
                .max(Comparator.naturalOrder())
                .map(d -> (int) ChronoUnit.DAYS.between(d, LocalDate.now()))
                .orElse(999);
        f.put("days_since_last_visit", daysSinceLast);

        int paymentDelays = (int) allPayments.stream()
                .filter(p -> member.getEmail() != null && member.getEmail().equals(p.getUserEmail()))
                .filter(p -> "REJECTED".equalsIgnoreCase(p.getStatus()))
                .count();
        f.put("payment_delays", paymentDelays);

        double avgSession = memberAttendance.isEmpty() ? 0.0
                : memberAttendance.stream()
                        .filter(r -> r.getCheckInTime() != null && r.getCheckOutTime() != null)
                        .mapToDouble(r -> ChronoUnit.MINUTES.between(r.getCheckInTime(), r.getCheckOutTime()))
                        .average().orElse(0.0);
        f.put("average_session_duration", avgSession);

        double feedbackScore = allFeedbacks.stream()
                .filter(fb -> member.getId().equals(fb.getMemberId()) && fb.getRating() > 0)
                .mapToDouble(Feedback::getRating)
                .average().orElse(2.5);
        f.put("feedback_score", feedbackScore);

        // ── Extra context (used in reasons display + fallback scoring only) ───

        boolean membershipExpired = false;
        long daysUntilExpiry = 0;
        if (member.getMembershipExpiryDate() != null) {
            daysUntilExpiry = ChronoUnit.DAYS.between(LocalDateTime.now(), member.getMembershipExpiryDate());
            membershipExpired = daysUntilExpiry < 0;
        }
        f.put("membership_expired",  membershipExpired);
        f.put("days_until_expiry",   daysUntilExpiry);
        f.put("membership_type",     member.getMembershipPackage() != null
                ? member.getMembershipPackage().toLowerCase() : "unknown");

        long unresolvedComplaints = allComplaints.stream()
                .filter(c -> member.getId().equals(c.getMemberId()))
                .filter(c -> !"Resolved".equalsIgnoreCase(c.getStatus()))
                .count();
        f.put("unresolved_complaints", (int) unresolvedComplaints);

        return f;
    }

    // =========================================================================
    // Reason builder
    // =========================================================================

    /**
     * Builds the human-readable explanation shown in the admin drawer.
     *
     * The first 6 items correspond EXACTLY to the 6 features the ML model used
     * to compute its decision — so the admin sees WHY the model scored this member.
     *
     * Any extra items below the divider are labelled "📋 Info:" to make it clear
     * they are additional context, NOT factors the model considered.
     */
    private List<String> buildReasons(Map<String, Object> f, String riskLevel, double probability) {
        List<String> reasons = new ArrayList<>();

        int    totalVisits    = (int)    f.get("total_visits");
        int    daysSinceLast  = (int)    f.get("days_since_last_visit");
        int    paymentDelays  = (int)    f.get("payment_delays");
        double avgSession     = (double) f.get("average_session_duration");
        double feedbackScore  = (double) f.get("feedback_score");
        long   membershipDays = (long)   f.get("membership_duration_days");

        // ── The same 6 features the model used ───────────────────────────────

        // 1. Total visits
        if (totalVisits == 0)         reasons.add("❌ Visits: Zero visits recorded");
        else if (totalVisits < 5)     reasons.add("❌ Visits: Very low — " + totalVisits + " visit(s)");
        else if (totalVisits < 15)    reasons.add("⚠️ Visits: Low — " + totalVisits + " visits");
        else                          reasons.add("✓ Visits: Good — " + totalVisits + " visits");

        // 2. Days since last visit
        if (daysSinceLast >= 999)            reasons.add("❌ Last Visit: Never attended");
        else if (daysSinceLast > 30)         reasons.add("❌ Last Visit: " + daysSinceLast + " days ago — prolonged absence");
        else if (daysSinceLast > 14)         reasons.add("⚠️ Last Visit: " + daysSinceLast + " days ago — declining frequency");
        else                                 reasons.add("✓ Last Visit: " + daysSinceLast + " day(s) ago — active");

        // 3. Average session duration
        if (avgSession == 0.0)               reasons.add("❌ Session Length: None — no check-ins completed");
        else if (avgSession < 30)            reasons.add("⚠️ Session Length: Short — avg " + (int) avgSession + " min");
        else if (avgSession < 60)            reasons.add("✓ Session Length: Moderate — avg " + (int) avgSession + " min");
        else                                 reasons.add("✓ Session Length: Strong — avg " + (int) avgSession + " min");

        // 4. Payment rejections
        if (paymentDelays > 2)               reasons.add("❌ Payments: " + paymentDelays + " rejected payments");
        else if (paymentDelays > 0)          reasons.add("⚠️ Payments: " + paymentDelays + " rejected payment(s)");
        else                                 reasons.add("✓ Payments: Clean history — no rejections");

        // 5. Satisfaction / feedback
        if (feedbackScore < 2.5)             reasons.add("❌ Satisfaction: Low — " + String.format("%.1f", feedbackScore) + "/5");
        else if (feedbackScore < 3.5)        reasons.add("⚠️ Satisfaction: Moderate — " + String.format("%.1f", feedbackScore) + "/5");
        else                                 reasons.add("✓ Satisfaction: High — " + String.format("%.1f", feedbackScore) + "/5");

        // 6. Membership duration
        if (membershipDays < 30)             reasons.add("ℹ️ Membership Age: New member — " + membershipDays + " day(s)");
        else if (membershipDays < 180)       reasons.add("ℹ️ Membership Age: " + membershipDays + " days since activation");
        else                                 reasons.add("✓ Membership Age: Long-term — " + (membershipDays / 30) + " months");

        // ── Additional context (NOT used by the model — shown for admin info) ─
        boolean membershipExpired    = (boolean) f.get("membership_expired");
        long    daysUntilExpiry      = (long)    f.get("days_until_expiry");
        int     unresolvedComplaints = (int)     f.get("unresolved_complaints");
        String  membershipType       = (String)  f.get("membership_type");

        if (membershipExpired)
            reasons.add("📋 Info: Membership EXPIRED " + Math.abs(daysUntilExpiry) + " day(s) ago");
        else if (daysUntilExpiry > 0 && daysUntilExpiry <= 14)
            reasons.add("📋 Info: Membership expires in " + daysUntilExpiry + " day(s)");

        if (unresolvedComplaints > 0)
            reasons.add("📋 Info: " + unresolvedComplaints + " unresolved complaint(s)");

        if (!"unknown".equals(membershipType))
            reasons.add("📋 Info: " + capitalize(membershipType) + " membership plan");

        // ── Summary banner (always shown first) ──────────────────────────────
        String banner = switch (riskLevel) {
            case "High"   -> "🚨 HIGH CHURN RISK ("   + String.format("%.0f%%", probability * 100) + " — AI model prediction)";
            case "Medium" -> "⚠️ MEDIUM CHURN RISK (" + String.format("%.0f%%", probability * 100) + " — AI model prediction)";
            default       -> "✅ LOW CHURN RISK ("     + String.format("%.0f%%", probability * 100) + " — AI model prediction)";
        };
        reasons.add(0, banner);

        return reasons;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}