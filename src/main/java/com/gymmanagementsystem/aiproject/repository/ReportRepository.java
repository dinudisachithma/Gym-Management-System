package com.gymmanagementsystem.aiproject.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.gymmanagementsystem.aiproject.model.Report;

public interface ReportRepository extends MongoRepository<Report, String> {
}
