"use client"

import { notFound } from 'next/navigation'
import Link from "next/link"
import DashboardNavbar from "@/components/dashboard-navbar"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react'

const streams = [
  {
    id: "frontend",
    title: "Frontend Development",
    icon: "🎨",
    description: "Master modern frontend technologies and frameworks",
    color: "from-blue-50 to-cyan-50",
    subcourses: [
      { id: "react", name: "React", difficulty: "Intermediate", info: "Build interactive UIs with React hooks and components" },
      { id: "vue", name: "Vue.js", difficulty: "Intermediate", info: "Create reactive applications with Vue's composition API" },
      { id: "angular", name: "Angular", difficulty: "Advanced", info: "Develop enterprise apps with TypeScript and RxJS" },
      { id: "nextjs", name: "Next.js", difficulty: "Advanced", info: "Master server-side rendering and static site generation" },
      { id: "typescript", name: "TypeScript", difficulty: "Intermediate", info: "Write type-safe JavaScript for scalable applications" },
      { id: "tailwind", name: "Tailwind CSS", difficulty: "Beginner", info: "Design modern UIs with utility-first CSS framework" },
    ],
  },
  {
    id: "backend",
    title: "Backend Development",
    icon: "⚙️",
    description: "Build scalable server-side applications",
    color: "from-purple-50 to-pink-50",
    subcourses: [
      { id: "nodejs", name: "Node.js", difficulty: "Intermediate", info: "Build scalable server applications with JavaScript runtime" },
      { id: "python", name: "Python", difficulty: "Intermediate", info: "Create robust backends with Django and Flask frameworks" },
      { id: "java", name: "Java", difficulty: "Advanced", info: "Develop enterprise applications with Spring Boot" },
      { id: "go", name: "Go", difficulty: "Advanced", info: "Build high-performance concurrent services" },
      { id: "dotnet", name: ".NET", difficulty: "Advanced", info: "Create modern applications with ASP.NET Core" },
      { id: "rust", name: "Rust", difficulty: "Advanced", info: "Write memory-safe systems programming code" },
    ],
  },
  {
    id: "fullstack",
    title: "Full Stack Development",
    icon: "🔗",
    description: "Combine frontend and backend expertise",
    color: "from-green-50 to-emerald-50",
    subcourses: [
      { id: "mern", name: "MERN Stack", difficulty: "Advanced", info: "MongoDB, Express, React, and Node.js ecosystem" },
      { id: "mean", name: "MEAN Stack", difficulty: "Advanced", info: "Build Angular applications with Node.js backend" },
      { id: "lamp", name: "LAMP Stack", difficulty: "Intermediate", info: "Traditional web development with Linux, Apache, MySQL, PHP" },
      { id: "jamstack", name: "JAMstack", difficulty: "Intermediate", info: "Modern web architecture with JavaScript, APIs, and Markup" },
      { id: "serverless", name: "Serverless", difficulty: "Advanced", info: "Build scalable apps without managing infrastructure" },
      { id: "microservices", name: "Microservices", difficulty: "Advanced", info: "Design distributed systems with service architecture" },
    ],
  },
  {
    id: "datascience",
    title: "Data Science & ML",
    icon: "📊",
    description: "Explore machine learning and data analysis",
    color: "from-orange-50 to-red-50",
    subcourses: [
      { id: "python-ds", name: "Python for DS", difficulty: "Intermediate", info: "Master NumPy, Pandas, and data visualization libraries" },
      { id: "ml", name: "Machine Learning", difficulty: "Advanced", info: "Build predictive models with scikit-learn and algorithms" },
      { id: "deeplearning", name: "Deep Learning", difficulty: "Advanced", info: "Create neural networks with TensorFlow and PyTorch" },
      { id: "nlp", name: "NLP", difficulty: "Advanced", info: "Process and analyze natural language data" },
      { id: "sql", name: "SQL & Databases", difficulty: "Intermediate", info: "Query and manage relational database systems" },
      { id: "analytics", name: "Data Analytics", difficulty: "Intermediate", info: "Extract insights from data with statistical analysis" },
    ],
  },
  {
    id: "devops",
    title: "DevOps & Cloud",
    icon: "☁️",
    description: "Master deployment and infrastructure",
    color: "from-indigo-50 to-blue-50",
    subcourses: [
      { id: "docker", name: "Docker", difficulty: "Intermediate", info: "Containerize applications for consistent deployment" },
      { id: "kubernetes", name: "Kubernetes", difficulty: "Advanced", info: "Orchestrate and manage containerized workloads" },
      { id: "aws", name: "AWS", difficulty: "Advanced", info: "Deploy scalable cloud infrastructure on Amazon Web Services" },
      { id: "gcp", name: "Google Cloud", difficulty: "Advanced", info: "Build applications on Google Cloud Platform" },
      { id: "azure", name: "Azure", difficulty: "Advanced", info: "Create enterprise solutions with Microsoft Azure" },
      { id: "cicd", name: "CI/CD Pipelines", difficulty: "Intermediate", info: "Automate testing and deployment workflows" },
    ],
  },
  {
    id: "mobile",
    title: "Mobile Development",
    icon: "📱",
    description: "Build native and cross-platform apps",
    color: "from-rose-50 to-pink-50",
    subcourses: [
      { id: "reactnative", name: "React Native", difficulty: "Intermediate", info: "Build cross-platform apps with React for mobile" },
      { id: "flutter", name: "Flutter", difficulty: "Intermediate", info: "Create beautiful native apps with Dart framework" },
      { id: "swift", name: "Swift (iOS)", difficulty: "Intermediate", info: "Develop native iOS applications with Swift" },
      { id: "kotlin", name: "Kotlin (Android)", difficulty: "Intermediate", info: "Build modern Android apps with Kotlin language" },
      { id: "xamarin", name: "Xamarin", difficulty: "Advanced", info: "Create cross-platform apps with C# and .NET" },
      { id: "ionic", name: "Ionic", difficulty: "Beginner", info: "Build hybrid mobile apps with web technologies" },
    ],
  },
  {
    id: "productmgmt",
    title: "Product Management",
    icon: "🎯",
    description: "Lead product strategy and vision",
    color: "from-yellow-50 to-amber-50",
    subcourses: [
      { id: "strategy", name: "Product Strategy", difficulty: "Advanced", info: "Define vision, goals, and product roadmaps" },
      { id: "research", name: "User Research", difficulty: "Intermediate", info: "Understand user needs through research and testing" },
      { id: "analytics", name: "Product Analytics", difficulty: "Intermediate", info: "Make data-driven decisions with metrics and KPIs" },
      { id: "roadmap", name: "Roadmap Planning", difficulty: "Intermediate", info: "Prioritize features and plan product releases" },
      { id: "stakeholder", name: "Stakeholder Mgmt", difficulty: "Advanced", info: "Align teams and communicate with stakeholders" },
      { id: "agile", name: "Agile & Scrum", difficulty: "Beginner", info: "Manage projects with agile methodologies" },
    ],
  },
  {
    id: "qa",
    title: "QA & Testing",
    icon: "✅",
    description: "Ensure quality and reliability",
    color: "from-teal-50 to-cyan-50",
    subcourses: [
      { id: "manual", name: "Manual Testing", difficulty: "Beginner", info: "Learn testing fundamentals and test case design" },
      { id: "automation", name: "Test Automation", difficulty: "Intermediate", info: "Automate testing with frameworks and best practices" },
      { id: "selenium", name: "Selenium", difficulty: "Intermediate", info: "Perform browser automation and web testing" },
      { id: "performance", name: "Performance Testing", difficulty: "Advanced", info: "Test application speed, scalability, and stability" },
      { id: "security", name: "Security Testing", difficulty: "Advanced", info: "Identify vulnerabilities and security flaws" },
      { id: "api", name: "API Testing", difficulty: "Intermediate", info: "Validate REST APIs and microservices endpoints" },
    ],
  },
]

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "bg-green-100 text-green-800"
    case "Intermediate":
      return "bg-yellow-100 text-yellow-800"
    case "Advanced":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default async function StreamPage({ params }: { params: { stream: string } }) {
  const { stream: streamId } = params
  const stream = streams.find((s) => s.id === streamId)

  if (!stream) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white">
      <DashboardNavbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to all courses</span>
        </Link>

        {/* Stream Header */}
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div className={`bg-gradient-to-br ${stream.color} p-6 rounded-2xl`}>
              <span className="text-6xl">{stream.icon}</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">{stream.title}</h1>
              <p className="text-lg text-gray-600">{stream.description}</p>
            </div>
          </div>
          <p className="text-sm text-blue-600 font-medium">{stream.subcourses.length} specialized courses available</p>
        </div>

        {/* Subcourses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stream.subcourses.map((subcourse) => (
            <Link key={subcourse.id} href={`/interview/course/${stream.id}/${subcourse.id}`}>
              <Card className="p-6 border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group h-full">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {subcourse.name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(subcourse.difficulty)}`}>
                    {subcourse.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{subcourse.info}</p>

                <div className="flex items-center justify-end">
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-105">
                    Start Interview
                  </button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
