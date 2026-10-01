import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dashboardApi, type DashboardSummary } from "../api/dashboard";
import { Building2, Users, FileText } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Departments", value: summary?.department_count ?? 0, icon: Building2, color: "bg-blue-500" },
    { label: "Users", value: summary?.user_count ?? 0, icon: Users, color: "bg-emerald-500" },
    { label: "Files Uploaded", value: summary?.file_upload_count ?? 0, icon: FileText, color: "bg-amber-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Institution overview &middot; Roles: {user?.roles.join(", ") || "None assigned"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4"
          >
            <div className={`${card.color} rounded-lg p-3 text-white`}>
              <card.icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/institutions" className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 transition-colors">
            Manage Institutions
          </a>
          <a href="/departments" className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 transition-colors">
            Manage Departments
          </a>
          <a href="/academic-years" className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 transition-colors">
            Manage Academic Years
          </a>
          <a href="/files" className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium text-gray-700 transition-colors">
            Upload Files
          </a>
        </div>
      </div>
    </div>
  );
}
