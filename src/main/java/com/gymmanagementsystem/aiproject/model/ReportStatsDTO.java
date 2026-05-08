package com.gymmanagementsystem.aiproject.model;

import java.util.List;
import java.util.Map;

public class ReportStatsDTO {

    public static class AttendanceStats {
        public long totalVisits;
        public long avgDaily;
        public long todayVisits;
        public String peakHour;
        public List<Integer> weeklyFootfall; // Mon-Sun
        public Map<String, List<Integer>> heatmap; // "6AM" -> [Mon, Tue... Sun]
    }

    public static class ChurnStats {
        public String churnRate;
        public int atRiskMembers;
        public int totalChurned;
        public int lowRiskMembers;
        public int mediumRiskMembers;
        public int highRiskMembers;
        public List<ChurnTrend> trend;

        public static class ChurnTrend {
            public String month;
            public double rate;
            public ChurnTrend(String m, double r) { this.month = m; this.rate = r; }
        }
    }
}
