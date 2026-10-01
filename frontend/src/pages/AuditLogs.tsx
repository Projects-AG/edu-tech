import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auditLogApi, type AuditLog } from "../api/auditLog";
import { ScrollText } from "lucide-react";

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.institution_id) return;
    auditLogApi.listByInstitution(user.institution_id)
      .then((res) => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.institution_id]);

  const actionColor = (action: string) => {
    if (action.includes("LOGIN")) return "bg-blue-50 text-blue-700";
    if (action.includes("CREATE")) return "bg-emerald-50 text-emerald-700";
    if (action.includes("UPLOAD")) return "bg-amber-50 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Track all actions performed in your institution</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-sm text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Entity Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Entity ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.entity_type}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                    {log.entity_id || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
