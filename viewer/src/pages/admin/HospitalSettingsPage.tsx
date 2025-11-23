import { useEffect, useState } from "react";
import { apiCall, uploadFile } from "../../services/ApiService";
import {
  Copy,
  CheckCircle2,
  Loader2,
  Upload,
  Settings as SettingsIcon,
} from "lucide-react";

export default function HospitalSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [hospitalId, setHospitalId] = useState("");
  const [hospitalUsername, setHospitalUsername] = useState("");

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    logoUrl: "",
    settings: {
      requireMFA: false,
      autoBackup: true,
      allowDataSharing: false,
      dataRetentionDays: 2555,
      allowedIPs: [],
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiCall("/api/hospital-settings/me");
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        const h = data.data.hospital;
        const s = data.data.settings;

        setHospitalId(h.hospitalId);
        setHospitalUsername(h.hospitalUsername);

        setForm({
          name: h.name || "",
          contactEmail: h.contactEmail || "",
          contactPhone: h.contactPhone || "",
          address: h.address || {},
          logoUrl: h.logoUrl || "",
          settings: s || {},
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAddress = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  };

  const updateSetting = (key: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setSaving(true);
      const res = await uploadFile("/api/hospital-settings/logo", file);
      const data = await res.json();
      if (data.success) {
        update("logoUrl", data.url);
        setSaved(true);
      } else setError(data.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);

      const res = await apiCall("/api/hospital-settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="w-full flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Hospital Settings
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage hospital profile, branding, and security settings
        </p>
      </div>

      {/* Hospital Info */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4 border border-gray-100">

        <h2 className="font-semibold text-gray-800">Account Information</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Hospital ID */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-sm text-gray-500">Hospital ID</p>
            <div className="flex justify-between mt-1">
              <span className="font-medium">{hospitalId}</span>
              <Copy
                className="w-5 h-5 text-gray-500 cursor-pointer hover:text-indigo-600"
                onClick={() => handleCopy(hospitalId)}
              />
            </div>
          </div>

          {/* Hospital Username */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-sm text-gray-500">Hospital Username</p>
            <div className="flex justify-between mt-1">
              <span className="font-medium">{hospitalUsername}</span>
              <Copy
                className="w-5 h-5 text-gray-500 cursor-pointer hover:text-indigo-600"
                onClick={() => handleCopy(hospitalUsername)}
              />
            </div>
          </div>
        </div>

      </div>

      {/* MAIN FORM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: BASIC DETAILS */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Hospital Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-gray-600">Hospital Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input
                  className="input"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Contact Number</label>
                <input
                  className="input"
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Address */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Address</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["street", "city", "state", "zipCode", "country"].map((key) => (
                <div key={key}>
                  <label className="text-sm text-gray-600 capitalize">{key}</label>
                  <input
                    className="input"
                    value={(form.address as any)[key] || ""}
                    onChange={(e) => updateAddress(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Settings Toggles */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
            <h3 className="font-semibold text-gray-800">Security Settings</h3>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Require MFA</span>
              <input
                type="checkbox"
                checked={form.settings.requireMFA}
                onChange={(e) => updateSetting("requireMFA", e.target.checked)}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Auto Backup</span>
              <input
                type="checkbox"
                checked={form.settings.autoBackup}
                onChange={(e) => updateSetting("autoBackup", e.target.checked)}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Allow Data Sharing</span>
              <input
                type="checkbox"
                checked={form.settings.allowDataSharing}
                onChange={(e) => updateSetting("allowDataSharing", e.target.checked)}
                className="toggle"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Data Retention (days)</label>
              <input
                type="number"
                className="input"
                value={form.settings.dataRetentionDays}
                onChange={(e) =>
                  updateSetting("dataRetentionDays", Number(e.target.value))
                }
              />
            </div>

          </div>

        </div>

        {/* RIGHT: LOGO UPLOADER */}
        <div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-semibold text-gray-800">Branding</h3>

            <div className="flex flex-col items-center mt-4">

              <img
                src={form.logoUrl || "https://via.placeholder.com/150"}
                className="w-28 h-28 rounded-full object-cover shadow"
              />

              <label className="mt-4">
                <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-indigo-700 transition">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Save Settings"
          )}
        </button>
      </div>

      {/* Saved message */}
      {saved && (
        <div className="flex items-center gap-2 text-green-600 mt-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );
}
