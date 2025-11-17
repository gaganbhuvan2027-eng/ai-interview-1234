import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import TechJobFacts from "@/components/tech-job-facts"
import Features from "@/components/features"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <TechJobFacts />
      <Footer />
    </main>
  )
}
