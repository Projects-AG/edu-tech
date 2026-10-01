import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  Calendar,
  Upload,
  ScrollText,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/institutions", label: "Institutions", icon: Building2 },
  { to: "/departments", label: "Departments", icon: FolderOpen },
  { to: "/academic-years", label: "Academic Years", icon: Calendar },
  { to: "/files", label: "File Upload", icon: Upload },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight">
            NAAC Platform
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Accreditation Management</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
