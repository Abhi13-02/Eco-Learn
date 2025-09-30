"use client";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LineCard, BarCard } from "@/components/Charts";
import SectionHeading from "@/components/dashboard/SectionHeading";

export default function NGOImpactDashboard() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("month"); // week, month, year

  // Example data structure for NGO impact
  const mockImpactData = useMemo(() => ({
    collaborations: {
      total: 18,
      active: 12,
      pending: 3,
      inactive: 3
    },
    outreach: {
      students: 2540,
      teachers: 145,
      schools: 18
    },
    campaignData: {
      weeklyLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      weeklyEngagement: [125, 180, 210, 265],
      monthlyLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      monthlyEngagement: [520, 680, 750, 830, 910, 1050],
      yearlyLabels: ["2024 Q1", "2024 Q2", "2024 Q3", "2024 Q4"],
      yearlyEngagement: [2500, 3200, 4100, 4800]
    },
    environmentalImpact: {
      labels: ["Waste Reduction", "Water Conservation", "Energy Saving", "Tree Planting", "Awareness"],
      values: [450, 380, 320, 290, 510]
    },
    recentCampaigns: [
      {
        id: "1",
        title: "Plastic-Free July",
        participants: 840,
        impact: "1.2 tons of plastic waste prevented",
        status: "active"
      },
      {
        id: "2",
        title: "Water Conservation Challenge",
        participants: 720,
        impact: "250,000 liters of water saved",
        status: "active"
      },
      {
        id: "3", 
        title: "Earth Day Celebration",
        participants: 1350,
        impact: "500 trees planted",
        status: "completed"
      }
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
        // fetch(`${apiUrl}/ngo/${session.user.orgId}/impact`)
        //   .then(res => res.json())
        //   .then(data => setImpactData(data))
        //   .catch(err => setError(err.message))
        //   .finally(() => setLoading(false));
        
        setImpactData(mockImpactData);
        setLoading(false);
      }
    }, 800);
    
    return () => { abort = true; };
  }, [apiUrl, session?.user?.id, mockImpactData]);

  // Get the appropriate data based on selected time range
  const timeData = useMemo(() => {
    if (!impactData) return { labels: [], values: [] };
    
    const campaignData = impactData.campaignData;
    
    switch (timeRange) {
      case "week":
        return { 
          labels: campaignData.weeklyLabels, 
          values: campaignData.weeklyEngagement 
        };
      case "year":
        return { 
          labels: campaignData.yearlyLabels, 
          values: campaignData.yearlyEngagement 
        };
      case "month":
      default:
        return { 
          labels: campaignData.monthlyLabels, 
          values: campaignData.monthlyEngagement 
        };
    }
  }, [impactData, timeRange]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Impact Dashboard"
        description="Track your organization's environmental impact and outreach metrics"
      />

      {loading ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8 text-center text-emerald-700">
          Loading impact data...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 text-center text-red-700">
          {error}
        </div>
      ) : impactData ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">School Collaborations</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{impactData.collaborations.total}</p>
              <div className="mt-4 flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Active</p>
                  <p className="font-semibold text-emerald-600">{impactData.collaborations.active}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Pending</p>
                  <p className="font-semibold text-amber-600">{impactData.collaborations.pending}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Inactive</p>
                  <p className="font-semibold text-slate-600">{impactData.collaborations.inactive}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Total Outreach</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{impactData.outreach.students.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Students reached</p>
              <div className="mt-4 flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Teachers</p>
                  <p className="font-semibold text-slate-700">{impactData.outreach.teachers}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Schools</p>
                  <p className="font-semibold text-slate-700">{impactData.outreach.schools}</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider">Key Achievement</p>
                <span className="text-2xl">🌱</span>
              </div>
              <p className="mt-2 text-3xl font-bold">500</p>
              <p className="text-emerald-100">Trees Planted</p>
              <p className="mt-4 text-sm font-medium">During Earth Day collaboration with Lincoln High School</p>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Engagement Over Time</h3>
              
              <div className="flex gap-2">
                {["week", "month", "year"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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
            
            <div className="h-96 w-full">
              <LineCard
                title=""
                labels={timeData.labels}
                seriesLabel="Student Engagement"
                data={timeData.values}
                color="#10b981"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Environmental Impact */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Environmental Impact Areas</h3>
              <div className="h-96 w-full">
                <BarCard
                  title=""
                  labels={impactData.environmentalImpact.labels}
                  seriesLabel="Impact Score"
                  data={impactData.environmentalImpact.values}
                  color="#0ea5e9"
                />
              </div>
            </div>
            
            {/* Recent Campaigns */}
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Campaigns</h3>
              
              <div className="space-y-4">
                {impactData.recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">{campaign.title}</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {campaign.participants.toLocaleString()} participants
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        campaign.status === "active" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {campaign.status === "active" ? "Active" : "Completed"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-emerald-600">
                      Impact: {campaign.impact}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <button className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50">
                  View All Campaigns
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 text-center text-slate-500">
          No impact data available yet. Start collaborating with schools to build your impact profile.
        </div>
      )}
    </div>
  );
}

