"use client";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LineCard, BarCard, PieCard } from "@/components/Charts";
import SectionHeading from "@/components/dashboard/SectionHeading";

export default function SchoolAdminOverview() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("month"); // week, month, year
  
  // Example mock data for school analytics
  const mockAnalyticsData = useMemo(() => ({
    userCount: {
      total: 1245,
      students: 1150,
      teachers: 75,
      admins: 20
    },
    participation: {
      activeStudents: 980,
      activePercentage: 85,
      taskCompletion: 76
    },
    taskMetrics: {
      total: 320,
      completed: 2450,
      pending: 180,
      rejected: 95
    },
    pointsDistribution: {
      weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      weeklyPoints: [450, 520, 480, 640, 580, 350, 310],
      monthlyLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      monthlyPoints: [1800, 2200, 1950, 1880],
      yearlyLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      yearlyPoints: [7800, 8500, 9200, 10500, 11200, 12100]
    },
    gradePerformance: {
      labels: ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
      values: [2800, 3200, 2900, 3400, 2750, 2600, 2400]
    },
    topPerformers: [
      { id: 1, name: "Anika Sharma", grade: "9", points: 450, badges: 8 },
      { id: 2, name: "Rahul Patel", grade: "10", points: 425, badges: 7 },
      { id: 3, name: "Priya Singh", grade: "8", points: 410, badges: 6 },
      { id: 4, name: "Vikram Mehra", grade: "11", points: 395, badges: 7 },
      { id: 5, name: "Neha Gupta", grade: "7", points: 380, badges: 5 }
    ],
    recentActivity: [
      { id: 1, type: "task", description: "Grade 8 completed the 'Water Conservation' challenge", time: "2 hours ago" },
      { id: 2, type: "ngo", description: "EcoGuardians NGO sent a collaboration request", time: "4 hours ago" },
      { id: 3, type: "award", description: "Grade 10 achieved the 'Carbon Footprint Reduction' badge", time: "1 day ago" },
      { id: 4, type: "task", description: "New 'Energy Audit' task created by Ms. Lakshmi", time: "1 day ago" },
      { id: 5, type: "student", description: "10 new students added to the platform", time: "2 days ago" }
    ]
  }), []);

  // In a real implementation, this would fetch from an API
  useEffect(() => {
    if (!session?.user?.id) return;
    
    let abort = false;
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      if (!abort) {
        // In production, this would be a real fetch call
        // fetch(`${apiUrl}/school/${session.user.orgId}/analytics`)
        //   .then(res => res.json())
        //   .then(data => setAnalyticsData(data))
        //   .catch(err => setError(err.message))
        //   .finally(() => setLoading(false));
        
        setAnalyticsData(mockAnalyticsData);
        setLoading(false);
      }
    }, 800);
    
    return () => { abort = true; };
  }, [apiUrl, session?.user?.id, mockAnalyticsData]);

  // Get the appropriate data based on selected time range
  const timeData = useMemo(() => {
    if (!analyticsData) return { labels: [], values: [] };
    
    const pointsData = analyticsData.pointsDistribution;
    
    switch (timeRange) {
      case "week":
        return { 
          labels: pointsData.weeklyLabels, 
          values: pointsData.weeklyPoints 
        };
      case "year":
        return { 
          labels: pointsData.yearlyLabels, 
          values: pointsData.yearlyPoints 
        };
      case "month":
      default:
        return { 
          labels: pointsData.monthlyLabels, 
          values: pointsData.monthlyPoints 
        };
    }
  }, [analyticsData, timeRange]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="School Analytics"
        description="Track student engagement, task completion, and overall environmental impact"
      />

      {loading ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8 text-center text-emerald-700">
          Loading analytics data...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 text-center text-red-700">
          {error}
        </div>
      ) : analyticsData ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Total Users</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{analyticsData.userCount.total}</p>
              <div className="mt-4 flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Students</p>
                  <p className="font-semibold text-emerald-600">{analyticsData.userCount.students}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Teachers</p>
                  <p className="font-semibold text-sky-600">{analyticsData.userCount.teachers}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Admins</p>
                  <p className="font-semibold text-amber-600">{analyticsData.userCount.admins}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Participation</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{analyticsData.participation.activePercentage}%</p>
              <p className="text-sm text-slate-500">Student activity rate</p>
              <div className="mt-4 flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Active Students</p>
                  <p className="font-semibold text-slate-700">{analyticsData.participation.activeStudents}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Task Completion</p>
                  <p className="font-semibold text-slate-700">{analyticsData.participation.taskCompletion}%</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider">Tasks Summary</p>
                <span className="text-2xl">📝</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{analyticsData.taskMetrics.total}</p>
              <p className="text-emerald-100">Total tasks</p>
              <div className="mt-4 flex justify-between text-sm">
                <p>
                  <span className="font-semibold">{analyticsData.taskMetrics.completed}</span>{" "}
                  <span className="text-emerald-200">completed</span>
                </p>
                <p>
                  <span className="font-semibold">{analyticsData.taskMetrics.pending}</span>{" "}
                  <span className="text-emerald-200">pending</span>
                </p>
              </div>
            </div>
          </div>

          {/* Points Distribution Chart */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Points Distribution</h3>
              
              <div className="flex gap-2">
                {["week", "month", "year"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      timeRange === range 
                        ? "bg-emerald-500 text-white" 
                        : "bg-slate-100 text-slate-600 hover:bg-emerald-100"
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-80">
              <LineCard
                title=""
                labels={timeData.labels}
                seriesLabel="Points Earned"
                data={timeData.values}
                color="#10b981"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Grade Performance */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Grade Performance</h3>
              <div className="h-80">
                <BarCard
                  title=""
                  labels={analyticsData.gradePerformance.labels}
                  seriesLabel="Points"
                  data={analyticsData.gradePerformance.values}
                  color="#0ea5e9"
                />
              </div>
            </div>
            
            {/* Task Status Distribution */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Task Status Distribution</h3>
              <div className="h-80">
                <PieCard
                  title=""
                  labels={["Completed", "Pending", "Rejected"]}
                  data={[
                    analyticsData.taskMetrics.completed,
                    analyticsData.taskMetrics.pending,
                    analyticsData.taskMetrics.rejected
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Performers */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Performers</h3>
              <div className="space-y-3">
                {analyticsData.topPerformers.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">Grade {student.grade}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">{student.points} pts</p>
                      <p className="text-xs text-slate-500">{student.badges} badges</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50">
                  View Full Leaderboard
                </button>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h3>
              
              <div className="space-y-3">
                {analyticsData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className={`mt-1 text-lg ${
                      activity.type === "task" ? "text-emerald-500" :
                      activity.type === "ngo" ? "text-amber-500" :
                      activity.type === "award" ? "text-purple-500" :
                      "text-blue-500"
                    }`}>
                      {activity.type === "task" ? "📝" :
                      activity.type === "ngo" ? "🤝" :
                      activity.type === "award" ? "🏆" :
                      activity.type === "student" ? "👥" : "📣"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{activity.description}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <button className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50">
                  View All Activity
                </button>
              </div>
            </div>
          </div>

          {/* User Management Panel */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
              <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                Manage Users
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Add new users, manage roles and permissions, and organize students by grade level.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
                <p className="text-xl font-bold text-emerald-600">Add Students</p>
                <p className="mt-2 text-sm text-slate-600">Import or individually add new students to your school</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
                <p className="text-xl font-bold text-emerald-600">Add Teachers</p>
                <p className="mt-2 text-sm text-slate-600">Register new teachers and assign their classes</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
                <p className="text-xl font-bold text-emerald-600">Manage Roles</p>
                <p className="mt-2 text-sm text-slate-600">Update permissions and role assignments</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 text-center text-slate-500">
          No analytics data available yet. Add students and teachers to begin tracking your school's progress.
        </div>
      )}
    </div>
  );
}

