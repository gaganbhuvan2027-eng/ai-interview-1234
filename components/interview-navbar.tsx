import Link from "next/link"

export default function InterviewNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
          HireMind
        </Link>
      </div>
    </nav>
  )
}
