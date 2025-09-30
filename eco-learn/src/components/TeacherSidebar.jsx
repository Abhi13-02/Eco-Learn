"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AcademicCapIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const navItems = [
  { name: "Dashboard", href: "/dashboard/teacher", icon: HomeIcon },
  { name: "Verify Submissions", href: "/dashboard/teacher/submissions", icon: ClipboardDocumentListIcon },
  { name: "Blog Posts", href: "/dashboard/blog", icon: Squares2X2Icon },
  { name: "Manage Class", href: "/dashboard/teacher/class", icon: AcademicCapIcon },
  { name: "Leaderboard", href: "/dashboard/teacher/leaderboard", icon: SparklesIcon },
  { name: "Resources", href: "/dashboard/teacher/resources", icon: FolderIcon },
  { name: "Settings", href: "/dashboard/teacher/settings", icon: Cog6ToothIcon },
];

export default function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 flex-shrink-0 border-r border-emerald-100 bg-white/95 px-4 py-6 shadow-sm lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <SparklesIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-600">EcoLearn</p>
          <p className="text-xs text-slate-500">Gamified Eco Education</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
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
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg">
        <p className="text-xs uppercase tracking-wider">Daily Impact</p>
        <p className="mt-2 text-sm font-semibold">You saved 2.3kg CO₂ today!</p>
      </div>
    </aside>
  );
}
