package com.gymmanagementsystem.aiproject.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.gymmanagementsystem.aiproject.model.Complaint;
import com.gymmanagementsystem.aiproject.model.User;
import com.gymmanagementsystem.aiproject.repository.ComplaintRepository;
import com.gymmanagementsystem.aiproject.repository.MemberRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ComplaintService {
    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private MemberRepository memberRepository;

    public Complaint saveComplaint(Complaint complaint) {
        // Generate sequential ticket ID
        if (complaint.getTicketId() == null || complaint.getTicketId().isEmpty()) {
            long count = complaintRepository.count();
            complaint.setTicketId(String.format("T%03d", count + 1));
        }
        // Replace MongoDB UUID memberId with real membershipId (GYM-XXX)
        if (complaint.getMemberEmail() != null) {
            Optional<User> userOpt = memberRepository.findByEmail(complaint.getMemberEmail());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String realId = user.getMembershipId() != null ? user.getMembershipId()
                              : user.getMemberNo() != null ? user.getMemberNo()
                              : complaint.getMemberId();
                complaint.setMemberId(realId);
            }
        }
        return complaintRepository.save(complaint);
    }

    public List<Complaint> getComplaintsByMemberId(String memberId) {
        return complaintRepository.findByMemberIdOrderBySubmittedAtDesc(memberId);
    }

    public List<Complaint> getComplaintsByMemberEmail(String email) {
        return complaintRepository.findByMemberEmailOrderBySubmittedAtDesc(email);
    }

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public Complaint updateComplaintStatus(String id, String status, String adminReply) {
        Optional<Complaint> c = complaintRepository.findById(id);
        if (c.isPresent()) {
            Complaint complaint = c.get();
            if (status != null && !status.isEmpty()) {
                complaint.setStatus(status);
            }
            if (adminReply != null && !adminReply.isEmpty()) {
                complaint.setAdminReply(adminReply);
                complaint.setStatus("Replied");
            }
            return complaintRepository.save(complaint);
        }
        return null;
    }

    public Complaint markComplaintInProgress(String id) {
        Optional<Complaint> c = complaintRepository.findById(id);
        if (c.isPresent()) {
            Complaint complaint = c.get();
            if ("Pending".equalsIgnoreCase(complaint.getStatus())) {
                complaint.setStatus("In Progress");
                return complaintRepository.save(complaint);
            }
            return complaint;
        }
        return null;
    }

    public Complaint addMessageToComplaint(String id, String senderRole, String messageText) {
        Optional<Complaint> c = complaintRepository.findById(id);
        if (c.isPresent()) {
            Complaint complaint = c.get();
            Complaint.ComplaintMessage newMessage = new Complaint.ComplaintMessage(senderRole, messageText);
            complaint.getMessages().add(newMessage);
            
            if ("Resolved".equalsIgnoreCase(complaint.getStatus())) {
                complaint.setStatus("In Progress");
            }
            
            if ("ADMIN".equalsIgnoreCase(senderRole)) {
                complaint.setStatus("Replied");
            }

            return complaintRepository.save(complaint);
        }
        return null;
    }

    public Complaint markComplaintAsResolved(String id) {
        Optional<Complaint> c = complaintRepository.findById(id);
        if (c.isPresent()) {
            Complaint complaint = c.get();
            complaint.setStatus("Resolved");
            return complaintRepository.save(complaint);
        }
        return null;
    }

    public Complaint updatePendingComplaint(String id, Complaint updatedData) {
        Optional<Complaint> c = complaintRepository.findById(id);
        if (c.isPresent()) {
            Complaint complaint = c.get();
            if ("Pending".equalsIgnoreCase(complaint.getStatus())) {
                if (updatedData.getCategory() != null && !updatedData.getCategory().isEmpty()) {
                    complaint.setCategory(updatedData.getCategory());
                }
                if (updatedData.getPriority() != null && !updatedData.getPriority().isEmpty()) {
                    complaint.setPriority(updatedData.getPriority());
                }
                if (updatedData.getDescription() != null && !updatedData.getDescription().isEmpty()) {
                    complaint.setDescription(updatedData.getDescription());
                }
                if (updatedData.getPhotoBase64() != null) {
                    complaint.setPhotoBase64(updatedData.getPhotoBase64());
                }
                return complaintRepository.save(complaint);
            }
        }
        return null;
    }

    public boolean deleteComplaint(String id) {
        if (complaintRepository.existsById(id)) {
            complaintRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
