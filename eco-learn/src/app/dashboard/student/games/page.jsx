"use client";
import { useState, useEffect } from "react";
import StudentSidebar from "@/components/StudentSidebar";
import UserMenu from "@/components/UserMenu";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function StudentGamesPage() {
  const { data: session, status } = useSession();
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "student") {
      redirect("/login");
    }
  }, [session, status]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  const welcomeName = session?.user?.name || "Eco Warrior";
  const gradeLabel = session?.user?.grade ? "Grade " + session.user.grade : "Explorer";

  const games = [
    {
      id: "eco-runner",
      title: "🌿 Eco Runner",
      description: "Run through an endless world collecting eco-friendly habits and avoiding bad environmental choices. Learn about sustainability while having fun!",
      features: [
        "Collect good habits (+10 points)",
        "Avoid bad habits (-15 points)",
        "Random obstacles each game",
        "Learn about sustainability"
      ],
      controls: "Arrow keys to move and jump",
      color: "from-green-500 to-emerald-600"
    },
    {
      id: "target-bin",
      title: "♻ Target Bin Challenge",
      description: "Test your recycling knowledge! Collect waste items and sort them into the correct bins. Learn proper waste management while earning points.",
      features: [
        "Sort waste into correct bins",
        "Different target bins each level",
        "Correct sorting (+10 points)",
        "Wrong sorting (-5 points)"
      ],
      controls: "Left/Right arrow keys to move basket",
      color: "from-blue-500 to-cyan-600"
    }
  ];

  const renderGame = () => {
    if (selectedGame === "eco-runner") {
      return (
        <div className="w-full h-full">
          <iframe
            src="/games/eco-runner.html"
            className="w-full h-full border-0 rounded-lg"
            title="Eco Runner"
          />
        </div>
      );
    }

    if (selectedGame === "target-bin") {
      return (
        <div className="w-full h-full">
          <iframe
            src="/games/target-bin.html"
            className="w-full h-full border-0 rounded-lg"
            title="Target Bin Challenge"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <StudentSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">EcoLearn</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Educational Games</h1>
              <p className="text-sm text-slate-500">Learn about environmental sustainability through fun and interactive games.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel={gradeLabel} points={0} badges={0} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {!selectedGame ? (
            <>
              {/* Welcome Banner */}
              <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Ready for some eco-learning fun, {welcomeName}? 🎮</p>
                    <h2 className="mt-2 text-3xl font-bold">Educational Games</h2>
                    <p className="mt-2 max-w-xl text-sm text-emerald-50">
                      Play interactive games that teach you about environmental sustainability, recycling, and eco-friendly habits.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Choose Your Game</p>
                    <p className="mt-2 text-[11px] text-slate-500">Learn while having fun</p>
                  </div>
                </div>
              </section>

              {/* Games Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`h-2 w-full rounded-t-3xl bg-gradient-to-r ${game.color} mb-4`}></div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-slate-900">{game.title}</h3>
                    </div>

                    <p className="text-slate-600 mb-4 leading-relaxed">{game.description}</p>

                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-slate-900">Features:</h4>
                      <ul className="space-y-1">
                        {game.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="text-emerald-500">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold text-slate-900 mb-1">Controls:</h4>
                      <p className="text-sm text-slate-600">{game.controls}</p>
                    </div>

                    <button
                      onClick={() => setSelectedGame(game.id)}
                      className={`w-full rounded-2xl bg-gradient-to-r ${game.color} px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity`}
                    >
                      Play Game
                    </button>
                  </div>
                ))}
              </div>

              {/* Educational Value Section */}
              <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Why Play These Games?</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🧠</div>
                    <h3 className="font-semibold text-slate-900">Learn While Playing</h3>
                    <p className="text-sm text-slate-600">Interactive learning makes environmental concepts stick better.</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌱</div>
                    <h3 className="font-semibold text-slate-900">Real-World Skills</h3>
                    <p className="text-sm text-slate-600">Practice sustainable habits you can apply in daily life.</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏆</div>
                    <h3 className="font-semibold text-slate-900">Gamified Learning</h3>
                    <p className="text-sm text-slate-600">Earn points and compete while building eco-awareness.</p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="space-y-4">
              {/* Game Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {games.find(g => g.id === selectedGame)?.title}
                  </h2>
                  <p className="text-slate-600">Have fun learning about environmental sustainability!</p>
                </div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
                >
                  ← Back to Games
                </button>
              </div>

              {/* Game Container */}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm h-[600px]">
                {renderGame()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
