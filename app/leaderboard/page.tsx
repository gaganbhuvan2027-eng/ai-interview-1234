"use client"

import DashboardNavbar from "@/components/dashboard-navbar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function LeaderboardPage() {
  const leaderboard = [
    { rank: 1, name: "Sarah Chen", score: 94, interviews: 28, avatar: "Sarah" },
    { rank: 2, name: "Michael Park", score: 91, interviews: 25, avatar: "Michael" },
    { rank: 3, name: "Emma Wilson", score: 89, interviews: 22, avatar: "Emma" },
    { rank: 4, name: "Alex Johnson", score: 82, interviews: 12, avatar: "Alex" },
    { rank: 5, name: "James Smith", score: 78, interviews: 18, avatar: "James" },
    { rank: 6, name: "Lisa Anderson", score: 76, interviews: 15, avatar: "Lisa" },
    { rank: 7, name: "David Brown", score: 74, interviews: 20, avatar: "David" },
    { rank: 8, name: "Jessica Lee", score: 72, interviews: 14, avatar: "Jessica" },
  ]

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return ""
  }

  return (
    <main className="min-h-screen bg-white">
      <DashboardNavbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Page Title */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-lg text-gray-600">See how you rank against other users.</p>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {leaderboard.slice(0, 3).map((user) => (
            <Card
              key={user.rank}
              className={`p-8 border-0 shadow-lg text-center ${
                user.rank === 1
                  ? "bg-gradient-to-br from-yellow-50 to-yellow-100 md:col-span-1 md:row-span-2"
                  : user.rank === 2
                    ? "bg-gradient-to-br from-gray-50 to-gray-100"
                    : "bg-gradient-to-br from-orange-50 to-orange-100"
              }`}
            >
              <div className="text-5xl mb-4">{getMedalEmoji(user.rank)}</div>
              <Avatar className="w-16 h-16 mx-auto mb-4">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{user.name}</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">{user.score}%</p>
              <p className="text-sm text-gray-600">{user.interviews} interviews</p>
            </Card>
          ))}
        </div>

        {/* Full Leaderboard Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Average Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Interviews</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((user) => (
                  <tr key={user.rank} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getMedalEmoji(user.rank)}</span>
                        <span className="font-bold text-gray-900">#{user.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-blue-100 text-blue-800">{user.score}%</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.interviews}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}
