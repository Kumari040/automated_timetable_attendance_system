// src/pages/HomePage.jsx
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold tracking-wide">
            Automated Timetable &amp; Attendance
          </h1>
          <nav className="space-x-4 text-sm font-medium">
            <Link to="/login" className="hover:underline">
              Login
            </Link>
            <Link to="/register" className="hover:underline">
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex  flex-col items-center justify-center bg-white py-6">
        <div className="max-w-3xl px-6 text-center">
          <h2 className="mb-6 bg-gradient-to-r from-sky-600 to-sky-600 bg-clip-text text-5xl font-extrabold text-transparent py-6">
            Simplify Academic Management
          </h2>
          <p className="mb-8 text-gray-600">
            Automate schedule creation, monitor attendance in real time, and
            gain actionable insights—all from a single intuitive dashboard.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/register"
              className="rounded-md bg-sky-600 px-8 py-3 font-semibold text-white shadow hover:bg-sky-600"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-sky-700 px-8 py-3 font-semibold text-sky-600 hover:bg-sky-50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-2 md:grid-cols-3">
          {[
            {
              title: "Smart Scheduling",
              description: "Generate clash‑free timetables in seconds.",
              icon: "📅",
            },
            {
              title: "Real-time Attendance",
              description: "Track attendance from any device instantly.",
              icon: "✅",
            },
            {
              title: "Analytics & Reports",
              description: "Visualize data with automated reports and charts.",
              icon: "📊",
            },
          ].map(({ title, description, icon }) => (
            <div
              key={title}
              className="rounded-lg border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 text-4xl">{icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-sky-700">
                {title}
              </h3>
              <p className="text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-sky-700 to-sky-600 py-16 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="mb-4 text-3xl font-bold">
            Ready to Streamline Your Campus?
          </h3>
          <p className="mb-8 text-indigo-100">
            Join institutions that rely on us for efficient timetable and
            attendance management.
          </p>
          <Link
            to="/register"
            className="rounded-md bg-white px-8 py-3 font-semibold text-sky-700 shadow hover:bg-sky-50"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-4 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Automated Timetable &amp; Attendance
      </footer>
    </div>
  );
}
