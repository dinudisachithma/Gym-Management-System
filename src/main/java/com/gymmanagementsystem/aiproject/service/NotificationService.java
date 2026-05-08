package com.gymmanagementsystem.aiproject.service;

import com.gymmanagementsystem.aiproject.model.NotificationRecord;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;
import com.gymmanagementsystem.aiproject.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private MemberRepository memberRepository;

    public long getUnreadCount() {
        return notificationRepository.countByStatus("UNREAD");
    }

    public List<NotificationRecord> getFeed(String filter) {
        String f = (filter == null ? "all" : filter).toLowerCase(Locale.ROOT);
        if ("unread".equals(f)) return notificationRepository.findByStatusOrderByCreatedAtDesc("UNREAD");
        if ("admin".equals(f)) return notificationRepository.findByTargetGroupOrderByCreatedAtDesc("ADMIN");
        if ("member".equals(f)) return notificationRepository.findByTargetGroupOrderByCreatedAtDesc("MEMBER");
        if ("trainer".equals(f)) return notificationRepository.findByTargetGroupOrderByCreatedAtDesc("TRAINER");
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<NotificationRecord> getMemberFeed(String memberId) {
        if (memberId == null || memberId.isBlank()) return new ArrayList<>();
        String normalized = normalizeMemberId(memberId);
        List<NotificationRecord> allMembers = notificationRepository.findByTargetGroupOrderByCreatedAtDesc("MEMBER");
        List<NotificationRecord> filtered = new ArrayList<>();
        for (NotificationRecord r : allMembers) {
            if (r.getMemberId() == null || r.getMemberId().equalsIgnoreCase(normalized)) {
                filtered.add(r);
            }
        }
        return filtered;
    }

    public void markRead(String id) {
        NotificationRecord rec = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        rec.setStatus("READ");
        notificationRepository.save(rec);
    }

    public void delete(String id) {
        if (!notificationRepository.existsById(id)) {
            throw new RuntimeException("Notification not found");
        }
        notificationRepository.deleteById(id);
    }

    public void sendManual(String title,
                             String message,
                             String type,
                             String senderName,
                             String targetScope,
                             String memberId) {

        String scope = (targetScope == null ? "ALL" : targetScope).toUpperCase(Locale.ROOT);
        String nType = (type == null || type.isBlank()) ? "INFO" : type.trim().toUpperCase(Locale.ROOT);
        String nSender = (senderName == null || senderName.isBlank()) ? "ADMIN" : senderName.trim();

        if ("SINGLE_MEMBER".equals(scope) || "SINGLE".equals(scope)) {
            String normalized = normalizeMemberId(memberId);
            Optional<User> u = memberRepository.findByMembershipIdIgnoreCase(normalized);
            NotificationRecord rec = new NotificationRecord();
            rec.setTitle(title);
            rec.setMessage(message);
            rec.setType(nType);
            rec.setSenderName(nSender);
            rec.setTargetGroup("MEMBER");
            rec.setMemberId(normalized);
            rec.setMemberName(u.map(User::getName).orElse(null));
            rec.setStatus("UNREAD");
            rec.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(rec);
            return;
        }

        if ("SINGLE_TRAINER".equals(scope)) {
            NotificationRecord rec = new NotificationRecord();
            rec.setTitle(title);
            rec.setMessage(message);
            rec.setType(nType);
            rec.setSenderName(nSender);
            rec.setTargetGroup("TRAINER");
            rec.setMemberId(memberId);
            rec.setStatus("UNREAD");
            rec.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(rec);
            return;
        }

        if ("ALL_MEMBERS".equals(scope) || "MEMBER".equals(scope)) {
            notificationRepository.save(makeGroupNotification(title, message, nType, nSender, "MEMBER"));
            return;
        }

        if ("ALL_TRAINERS".equals(scope) || "TRAINER".equals(scope)) {
            notificationRepository.save(makeGroupNotification(title, message, nType, nSender, "TRAINER"));
            return;
        }

        // ALL → create records for ALL groups
        notificationRepository.save(makeGroupNotification(title, message, nType, nSender, "ADMIN"));
        notificationRepository.save(makeGroupNotification(title, message, nType, nSender, "MEMBER"));
        notificationRepository.save(makeGroupNotification(title, message, nType, nSender, "TRAINER"));
    }

    public void createSystemAttendanceAlert(String title,
                                             String message,
                                             String memberId,
                                             String memberName) {
        NotificationRecord rec = new NotificationRecord();
        rec.setTitle(title);
        rec.setMessage(message);
        rec.setType("INFO");
        rec.setSenderName("SYSTEM");
        rec.setTargetGroup("MEMBER");
        rec.setMemberId(memberId);
        rec.setMemberName(memberName);
        rec.setStatus("UNREAD");
        rec.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(rec);
    }

    private NotificationRecord makeGroupNotification(String title, String message, String type, String senderName, String targetGroup) {
        NotificationRecord rec = new NotificationRecord();
        rec.setTitle(title);
        rec.setMessage(message);
        rec.setType(type);
        rec.setSenderName(senderName);
        rec.setTargetGroup(targetGroup);
        rec.setMemberId(null);
        rec.setMemberName(null);
        rec.setStatus("UNREAD");
        rec.setCreatedAt(LocalDateTime.now());
        return rec;
    }

    private String normalizeMemberId(String inputMemberId) {
        if (inputMemberId == null || inputMemberId.isBlank()) {
            throw new RuntimeException("Member ID is required");
        }
        String cleaned = inputMemberId.trim().toUpperCase(Locale.ROOT);
        if (cleaned.startsWith("GYM-")) return cleaned;
        if (cleaned.matches("^M\\d{3}$")) return "GYM-" + cleaned.substring(1);
        if (cleaned.matches("^\\d{3}$")) return "GYM-" + cleaned;
        return cleaned;
    }
}

