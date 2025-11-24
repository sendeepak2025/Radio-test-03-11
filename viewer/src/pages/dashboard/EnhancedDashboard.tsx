import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  RefreshCw,
  Activity,
  Users,
  HardDrive,
  Gauge,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Monitor,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ---------- Types ----------

interface MachineStats {
  modality: string;
  machineName: string;
  totalStudies: number;
  totalSeries: number;
  totalInstances: number;
  uniquePatients: number;
  lastActivity: string;
  status: "active" | "idle" | "error" | string;
  avgStudiesPerHour: string;
}

interface SystemHealth {
  systemStatus: string;
  metrics: {
    totalStudies: number;
    totalPatients: number;
    totalSeries: number;
    totalInstances: number;
    recentStudies24h: number;
    avgStudiesPerHour: string;
    totalStorageGB: string;
  };
  recentActivity: {
    _id: string;
    studyInstanceUID: string;
    patientName: string;
    modality: string;
    createdAt: string;
  }[];
  timestamp: string;
}

// ---------- Helper: Color Maps ----------

const metricColorMap: Record<
  string,
  { bg: string; text: string }
> = {
  sky: { bg: "bg-sky-100", text: "text-sky-600" },
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
};

const statusColorMap: Record<
  string,
  { bg: string; text: string; pillBg: string; pillText: string; stroke: string }
> = {
  healthy: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    pillBg: "bg-emerald-100",
    pillText: "text-emerald-700",
    stroke: "#22c55e",
  },
  "low-activity": {
    bg: "bg-sky-50",
    text: "text-sky-700",
    pillBg: "bg-sky-100",
    pillText: "text-sky-700",
    stroke: "#0ea5e9",
  },
  "high-load": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    pillBg: "bg-amber-100",
    pillText: "text-amber-700",
    stroke: "#f59e0b",
  },
  error: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    pillBg: "bg-rose-100",
    pillText: "text-rose-700",
    stroke: "#f43f5e",
  },
};

// ---------- Metric Card ----------

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number | string }>;
  colorKey: "sky" | "violet" | "emerald" | "amber";
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorKey,
  loading,
}) => {
  const colors = metricColorMap[colorKey] || metricColorMap.sky;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 rounded-full bg-slate-200 animate-pulse" />
          ) : (
            <h2 className="text-3xl font-bold mt-1">
              {typeof value === "number"
                ? value.toLocaleString()
                : value || "0"}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div
          className={`w-12 h-12 flex items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}
        >
          <Icon size={26} />
        </div>
      </div>
    </div>
  );
};

// ---------- Status Card ----------

interface StatusCardProps {
  status: string;
  activeMachines: number;
  totalMachines: number;
  loading?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  status,
  activeMachines,
  totalMachines,
  loading,
}) => {
  const percent = totalMachines
    ? Math.round((activeMachines / totalMachines) * 100)
    : 0;

  let label = "System Error";
  let Icon = XCircle;
  let key: keyof typeof statusColorMap = "error";

  if (status === "healthy") {
    label = "Healthy";
    Icon = CheckCircle;
    key = "healthy";
  } else if (status === "low-activity") {
    label = "Low Activity";
    Icon = AlertTriangle;
    key = "low-activity";
  } else if (status === "high-load") {
    label = "High Load";
    Icon = AlertTriangle;
    key = "high-load";
  }

  const colors = statusColorMap[key];

  return (
    <div
      className={`rounded-2xl shadow-md p-6 border border-slate-100 hover:shadow-xl transition-all duration-300 ${colors.bg}`}
    >
      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-500 text-sm font-medium">System Status</p>
        <span
          className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full ${colors.pillBg} ${colors.pillText} font-semibold`}
        >
          <Icon size={14} /> {label}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center my-6">
          <div className="w-24 h-24 rounded-full bg-slate-200 animate-pulse" />
        </div>
      ) : (
        <div className="flex justify-center my-4 relative">
          <svg width="140" height="140">
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="10"
              strokeDasharray={`${(percent / 100) * 377} 377`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              className="transition-all duration-700"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-3xl font-bold ${colors.text}`}>
              {activeMachines}
            </p>
            <p className="text-slate-400 text-xs">of {totalMachines}</p>
            <p className="text-slate-400 text-[11px] mt-1">
              {percent}% active
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center mt-2">
        Monitoring connected modalities and system load
      </p>
    </div>
  );
};

// ---------- Machine Card ----------

interface MachineCardProps {
  machine: MachineStats;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine }) => {
  const colorKey =
    machine.status === "active"
      ? "emerald"
      : machine.status === "idle"
      ? "amber"
      : "error";

  const colorClasses: Record<
    string,
    { bg: string; text: string; pillBg: string; pillText: string }
  > = {
    emerald: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      pillBg: "bg-emerald-100",
      pillText: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      pillBg: "bg-amber-100",
      pillText: "text-amber-700",
    },
    error: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      pillBg: "bg-rose-100",
      pillText: "text-rose-700",
    },
  };

  const colors = colorClasses[colorKey];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}
            >
              <Monitor size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">{machine.machineName}</p>
              <p className="text-xs text-slate-400">{machine.modality}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs rounded-full ${colors.pillBg} ${colors.pillText} font-semibold capitalize`}
          >
            {machine.status}
          </span>
        </div>

        <div className="space-y-2 text-sm mt-2">
          <div className="flex justify-between">
            <p className="text-slate-400">Studies</p>
            <p className="font-semibold">
              {machine.totalStudies.toLocaleString()}
            </p>
          </div>

          <div className="flex justify-between">
            <p className="text-slate-400">Images</p>
            <p className="font-semibold">
              {machine.totalInstances.toLocaleString()}
            </p>
          </div>

          <div className="flex justify-between">
            <p className="text-slate-400">Patients</p>
            <p className="font-semibold">
              {machine.uniquePatients.toLocaleString()}
            </p>
          </div>

          <div className="flex justify-between">
            <p className="text-slate-400">Avg/Hour</p>
            <p className="font-semibold">{machine.avgStudiesPerHour}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Last activity: {new Date(machine.lastActivity).toLocaleString()}
      </p>
    </div>
  );
};

// ---------- Main Component ----------

export const EnhancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<MachineStats[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      const [machinesRes, healthRes] = await Promise.all([
        axios.get(`/api/monitoring/machines?timeRange=${timeRange}`),
        axios.get("/api/monitoring/system-health"),
      ]);

      if (machinesRes.data?.success) {
        setMachines(machinesRes.data.data.machines || []);
      }

      if (healthRes.data?.success) {
        setSystemHealth(healthRes.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err?.response?.data?.message || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, timeRange]);

  const totalMachines = machines.length;
  const activeMachines = machines.filter((m) => m.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            System Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitoring & analytics for your hospital imaging system.
          </p>
          {systemHealth && (
            <p className="text-[11px] text-slate-400 mt-1">
              Updated at{" "}
              {new Date(systemHealth.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-500 text-sky-600 text-sm font-medium bg-white shadow-sm hover:bg-sky-50 transition"
          >
            <RefreshCw size={16} className="mr-0.5" />
            Refresh
          </button>

          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            Auto refresh {autoRefresh ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <XCircle size={16} className="mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load data</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Studies"
          value={systemHealth?.metrics.totalStudies || 0}
          subtitle={`${systemHealth?.metrics.recentStudies24h || 0} in last 24h`}
          icon={Activity}
          colorKey="sky"
          loading={loading}
        />
        <MetricCard
          title="Total Patients"
          value={systemHealth?.metrics.totalPatients || 0}
          subtitle="Unique patients"
          icon={Users}
          colorKey="violet"
          loading={loading}
        />
        <MetricCard
          title="Storage Used"
          value={`${systemHealth?.metrics.totalStorageGB || "0.00"} GB`}
          subtitle={`${systemHealth?.metrics.totalInstances?.toLocaleString() || 0
            } images`}
          icon={HardDrive}
          colorKey="amber"
          loading={loading}
        />
        <MetricCard
          title="Avg Studies / Hour"
          value={systemHealth?.metrics.avgStudiesPerHour || "0.00"}
          subtitle="Processing rate"
          icon={Gauge}
          colorKey="emerald"
          loading={loading}
        />
      </div>

      {/* Status + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatusCard
          status={systemHealth?.systemStatus || "error"}
          activeMachines={activeMachines}
          totalMachines={totalMachines}
          loading={loading}
        />

        {/* Recent activity list */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-slate-100 p-5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-800">
              Recent Activity
            </p>
            <p className="text-xs text-slate-400">
              Last {systemHealth?.recentActivity?.length || 0} studies
            </p>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : !systemHealth?.recentActivity?.length ? (
            <p className="text-xs text-slate-400">
              No recent activity in selected time range.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {systemHealth.recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between text-xs bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 transition"
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {item.patientName || "Unknown Patient"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.modality} •{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px]">
                    {item.studyInstanceUID.slice(0, 12)}...
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Machines */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Connected Machines
        </h2>
        <p className="text-xs text-slate-400">
          {totalMachines} machine(s) • {activeMachines} active
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : !machines.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 flex flex-col items-center justify-center text-center">
          <Monitor className="text-slate-300 mb-3" size={48} />
          <p className="text-sm font-semibold text-slate-700 mb-1">
            No machine activity
          </p>
          <p className="text-xs text-slate-400">
            No machines reported activity in the selected time range.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {machines.map((machine) => (
            <MachineCard key={machine.machineName + machine.modality} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard;
