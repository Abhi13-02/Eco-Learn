"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "My Tasks", href: "/dashboard/student", icon: "📝" },
  { name: "Leaderboard", href: "/dashboard/student/leaderboard", icon: "🏅" },
  { name: "Badges", href: "/dashboard/student/badges", icon: "🎖️" },
  { name: "Notifications", href: "/dashboard/student/notifications", icon: "🔔" },
  { name: "Blog Posts", href: "/dashboard/blog", icon: "📝" },
  { name: "Profile", href: "/dashboard/student/profile", icon: "👤" },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-60 flex-shrink-0 border-r border-emerald-100 bg-white/95 px-4 py-6 shadow-sm lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl">
          🌱
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-600">EcoLearn</p>
          <p className="text-xs text-slate-500">Student Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-emerald-100 text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
              ].join(" ")}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg">
        <p className="text-xs uppercase tracking-wider">Daily Impact</p>
        <p className="mt-2 text-sm font-semibold">Keep going! Every action counts.</p>
      </div>
    </aside>
  );
}
