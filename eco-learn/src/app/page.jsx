export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-3xl text-center space-y-6">
        <span className="tracking-[0.3em] uppercase text-emerald-500 text-xs font-semibold">
          Eco-Learn
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
          Empower your sustainability journey
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Eco-Learn helps people discover approachable ways to reduce their environmental impact through curated lessons, practical challenges, and community inspiration.
        </p>
        <a
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-10 py-3 transition-colors"
          href="/login"
        >
          Get Started
        </a>
      </div>
    </main>
  );
}
