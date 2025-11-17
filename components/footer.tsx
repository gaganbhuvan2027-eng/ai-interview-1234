import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 relative">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left - Logo */}
          <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            HireMind
          </div>

          {/* Center - Links */}
          <div className="flex items-center gap-8">
            <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </div>

          {/* Right - Copyright */}
          <div className="text-gray-500 text-sm">© 2025 HireMind. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
