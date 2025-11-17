"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, TrendingUp, TrendingDown, Award, Users, Target, BarChart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"

interface MemberPerformance {
  id: string
  name: string
  email: string
  totalInterviews: number
  averageScore: number
  latestScore: number
  trend: string
  scores: { date: string; score: number }[]
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  confidenceScore: number
}

interface SkillBreakdown {
  skill: string
  score: number
}

export default function PerformanceAnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<MemberPerformance[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberPerformance | null>(null)
  const [scoreDistribution, setScoreDistribution] = useState<{ range: string; count: number }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; avgScore: number; interviews: number }[]>([])
  const [skillsData, setSkillsData] = useState<SkillBreakdown[]>([])

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      const { data: userProfile } = await supabase.from("users").select("institution_id").eq("id", user.id).single()

      if (!userProfile) return

      const { data: institutionMembers } = await supabase
        .from("institution_members")
        .select("*, users:user_id(id, email, name)")
        .eq("institution_id", userProfile.institution_id)

      if (!institutionMembers) {
        setMembers([])
        return
      }

      const performanceData: MemberPerformance[] = []
      const monthlyData: { [key: string]: { total: number; count: number } } = {}

      for (const member of institutionMembers) {
        const { data: interviews } = await supabase
          .from("interviews")
          .select("id, completed_at")
          .eq("user_id", member.users.id)
          .eq("status", "completed")

        const { data: results } = await supabase
          .from("interview_results")
          .select(
            "overall_score, technical_score, communication_score, problem_solving_score, confidence_score, created_at",
          )
          .in("interview_id", interviews?.map((i) => i.id) || [])
          .order("created_at", { ascending: true })

        const scores = results || []
        const averageScore =
          scores.length > 0 ? Math.round(scores.reduce((sum, r) => sum + r.overall_score, 0) / scores.length) : 0
        const latestScore = scores.length > 0 ? scores[scores.length - 1].overall_score : 0
        const previousScore = scores.length > 1 ? scores[scores.length - 2].overall_score : averageScore

        // Calculate skill averages
        const technicalScore =
          scores.length > 0
            ? Math.round(scores.reduce((sum, r) => sum + (r.technical_score || 0), 0) / scores.length)
            : 0
        const communicationScore =
          scores.length > 0
            ? Math.round(scores.reduce((sum, r) => sum + (r.communication_score || 0), 0) / scores.length)
            : 0
        const problemSolvingScore =
          scores.length > 0
            ? Math.round(scores.reduce((sum, r) => sum + (r.problem_solving_score || 0), 0) / scores.length)
            : 0
        const confidenceScore =
          scores.length > 0
            ? Math.round(scores.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / scores.length)
            : 0

        // Track monthly data
        scores.forEach((s) => {
          const month = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, count: 0 }
          }
          monthlyData[month].total += s.overall_score
          monthlyData[month].count += 1
        })

        performanceData.push({
          id: member.users.id,
          name: member.users.name || "Unknown",
          email: member.users.email,
          totalInterviews: interviews?.length || 0,
          averageScore,
          latestScore,
          trend: latestScore >= previousScore ? "up" : "down",
          scores: scores.map((s) => ({
            date: new Date(s.created_at).toLocaleDateString(),
            score: s.overall_score,
          })),
          technicalScore,
          communicationScore,
          problemSolvingScore,
          confidenceScore,
        })
      }

      setMembers(performanceData)
      setSelectedMember(performanceData[0] || null)

      // Calculate score distribution
      const distribution = [
        { range: "0-20", count: performanceData.filter((m) => m.averageScore < 20).length },
        { range: "20-40", count: performanceData.filter((m) => m.averageScore >= 20 && m.averageScore < 40).length },
        { range: "40-60", count: performanceData.filter((m) => m.averageScore >= 40 && m.averageScore < 60).length },
        { range: "60-80", count: performanceData.filter((m) => m.averageScore >= 60 && m.averageScore < 80).length },
        { range: "80-100", count: performanceData.filter((m) => m.averageScore >= 80).length },
      ]
      setScoreDistribution(distribution)

      // Calculate monthly trend
      const trend = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        avgScore: Math.round(data.total / data.count),
        interviews: data.count,
      }))
      setMonthlyTrend(trend)

      // Calculate overall skills data
      if (performanceData.length > 0) {
        const avgSkills = [
          {
            skill: "Technical",
            score: Math.round(performanceData.reduce((sum, m) => sum + m.technicalScore, 0) / performanceData.length),
          },
          {
            skill: "Communication",
            score: Math.round(
              performanceData.reduce((sum, m) => sum + m.communicationScore, 0) / performanceData.length,
            ),
          },
          {
            skill: "Problem Solving",
            score: Math.round(
              performanceData.reduce((sum, m) => sum + m.problemSolvingScore, 0) / performanceData.length,
            ),
          },
          {
            skill: "Confidence",
            score: Math.round(performanceData.reduce((sum, m) => sum + m.confidenceScore, 0) / performanceData.length),
          },
        ]
        setSkillsData(avgSkills)
      }
    } catch (error) {
      console.error("Error fetching performance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"]
  const CHART_COLORS = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Performance Analytics
          </h1>
          <p className="text-gray-600 mt-1">Deep insights into member interview performance</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {members.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <BarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No performance data available</p>
                <p className="text-sm mt-2">Members need to complete interviews to see analytics</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white border border-gray-200 p-1">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-2">
                <Target className="w-4 h-4" />
                Skills
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-100">Institution Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">
                      {Math.round(members.reduce((sum, m) => sum + m.averageScore, 0) / members.length)}%
                    </div>
                    <p className="text-xs text-blue-100 mt-1">Overall performance</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-100">Total Interviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{members.reduce((sum, m) => sum + m.totalInterviews, 0)}</div>
                    <p className="text-xs text-purple-100 mt-1">Completed by all members</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-100">Active Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{members.filter((m) => m.totalInterviews > 0).length}</div>
                    <p className="text-xs text-green-100 mt-1">With completed interviews</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-orange-100">Top Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{Math.max(...members.map((m) => m.averageScore))}%</div>
                    <p className="text-xs text-orange-100 mt-1">Highest average</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>Members grouped by performance range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={scoreDistribution}
                          dataKey="count"
                          nameKey="range"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ range, count }) => `${range}: ${count}`}
                        >
                          {scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Top 5 Performers
                    </CardTitle>
                    <CardDescription>Highest average scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {members
                        .sort((a, b) => b.averageScore - a.averageScore)
                        .slice(0, 5)
                        .map((member, index) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                  index === 0
                                    ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                    : index === 1
                                      ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                      : index === 2
                                        ? "bg-gradient-to-br from-orange-400 to-orange-600"
                                        : "bg-gradient-to-br from-blue-400 to-blue-600"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.totalInterviews} interviews</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{member.averageScore}%</p>
                              <div className="flex items-center gap-1 text-xs">
                                {member.trend === "up" ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                )}
                                <span className={member.trend === "up" ? "text-green-600" : "text-red-600"}>
                                  {member.trend}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Monthly Performance Trend</CardTitle>
                  <CardDescription>Average scores and interview volume over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="avgScore"
                        stroke={CHART_COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        name="Avg Score"
                      />
                      <Bar yAxisId="right" dataKey="interviews" fill={CHART_COLORS.secondary} name="Interviews" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              {/* Member Selector */}
              {selectedMember && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          {selectedMember.name}
                        </CardTitle>
                        <CardDescription>{selectedMember.email}</CardDescription>
                      </div>
                      <select
                        value={selectedMember.id}
                        onChange={(e) => {
                          const member = members.find((m) => m.id === e.target.value)
                          setSelectedMember(member || null)
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Member Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">{selectedMember.averageScore}%</p>
                        <p className="text-sm text-gray-600 mt-1">Avg Score</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <p className="text-3xl font-bold text-purple-600">{selectedMember.totalInterviews}</p>
                        <p className="text-sm text-gray-600 mt-1">Interviews</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">{selectedMember.latestScore}%</p>
                        <p className="text-sm text-gray-600 mt-1">Latest</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                          {selectedMember.trend === "up" ? (
                            <TrendingUp className="w-6 h-6 text-green-600" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-red-600" />
                          )}
                          <p className="text-3xl font-bold text-gray-900 capitalize">{selectedMember.trend}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Trend</p>
                      </div>
                    </div>

                    {/* Performance Chart */}
                    {selectedMember.scores.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Performance Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={selectedMember.scores}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke={CHART_COLORS.primary}
                              strokeWidth={3}
                              dot={{ r: 6, fill: CHART_COLORS.primary }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* All Members Table */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>All Members Performance</CardTitle>
                  <CardDescription>Comprehensive overview of all member statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Member</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Interviews</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Avg Score</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Latest</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Trend</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members
                          .sort((a, b) => b.averageScore - a.averageScore)
                          .map((member) => (
                            <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-900">{member.name}</p>
                                  <p className="text-xs text-gray-500">{member.email}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-900">{member.totalInterviews}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge
                                  className={
                                    member.averageScore >= 80
                                      ? "bg-green-100 text-green-700"
                                      : member.averageScore >= 60
                                        ? "bg-blue-100 text-blue-700"
                                        : member.averageScore >= 40
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                  }
                                >
                                  {member.averageScore}%
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-900">{member.latestScore}%</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {member.trend === "up" ? (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                  )}
                                  <span
                                    className={`text-xs font-medium ${member.trend === "up" ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {member.trend}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge
                                  className={
                                    member.totalInterviews > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-700"
                                  }
                                >
                                  {member.totalInterviews > 0 ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skills Radar Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Institution Skills Overview</CardTitle>
                    <CardDescription>Average performance across all skill categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={skillsData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar
                          name="Average Score"
                          dataKey="score"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Skills Breakdown */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Skills Breakdown</CardTitle>
                    <CardDescription>Detailed performance by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {skillsData.map((skill) => (
                        <div key={skill.skill}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{skill.skill}</span>
                            <span className="text-lg font-bold text-blue-600">{skill.score}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                skill.score >= 80
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : skill.score >= 60
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                    : skill.score >= 40
                                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                                      : "bg-gradient-to-r from-red-500 to-red-600"
                              }`}
                              style={{ width: `${skill.score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Skills Comparison Bar Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Skills Comparison</CardTitle>
                  <CardDescription>Compare average scores across different skill areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={skillsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="skill" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
