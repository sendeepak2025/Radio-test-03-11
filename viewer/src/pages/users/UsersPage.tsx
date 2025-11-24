"use client";

import React, { useEffect, useState } from "react";
import {
  UsersRound,
  UserPlus,
  Search,
  X,
  Pencil,
  Trash2,
  Shield,
  Ban,
} from "lucide-react";
import ApiService from "../../services/ApiService";

// ---------- Types ----------
interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: string;
}

interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  password?: string;
}

// ---------- Component ----------
const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"all" | "providers" | "staff" | "techs" | "admin">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState<UserFormData>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    roles: [],
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ------------ Load users ------------
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res: any = await ApiService.getUsers();
      if (!res.success) throw new Error(res.message || "Failed to load users");

      setUsers(res.data || []);
      setFilteredUsers(res.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ------------ Filter + search ------------
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    const roleFilter = (u: User) => {
      if (tab === "providers") {
        return (
          u.roles.includes("provider") ||
          u.roles.includes("doctor") ||
          u.roles.includes("radiologist")
        );
      }
      if (tab === "staff") {
        return (
          u.roles.includes("staff") ||
          u.roles.includes("nurse") ||
          u.roles.includes("receptionist")
        );
      }
      if (tab === "techs") return u.roles.includes("technician");
      if (tab === "admin") {
        return u.roles.includes("admin") || u.roles.includes("system:admin");
      }
      return true;
    };

    let list = users.filter(roleFilter);

    if (term) {
      list = list.filter(
        (u) =>
          u.firstName.toLowerCase().includes(term) ||
          u.lastName.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(list);
  }, [users, tab, searchTerm]);

  // ------------ Helpers ------------
  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      roles: [],
      password: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleFormChange = (field: keyof UserFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRolesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setForm((prev) => ({ ...prev, roles: values }));
  };

  const getRoleChipClasses = (role: string) => {
    const map: Record<string, string> = {
      doctor: "bg-[#E3EAFF] text-[#2B59FF]",
      radiologist: "bg-[#E3EAFF] text-[#2B59FF]",
      provider: "bg-[#E3EAFF] text-[#2B59FF]",
      staff: "bg-[#DFF8EC] text-[#1B8A4A]",
      nurse: "bg-[#DFF8EC] text-[#1B8A4A]",
      receptionist: "bg-[#FFEED1] text-[#B47307]",
      technician: "bg-[#F2E8FF] text-[#6B21A8]",
      admin: "bg-[#FFE4E6] text-[#B91C1C]",
      "system:admin": "bg-[#FFE4E6] text-[#B91C1C]",
    };
    return map[role] || "bg-slate-100 text-slate-600";
  };

  // ------------ Save user ------------
  const handleSaveUser = async () => {
    try {
      setError(null);

      if (!form.username || !form.email || !form.firstName || !form.lastName) {
        setError("Please fill all required fields.");
        return;
      }

      if (!editingUser && !form.password) {
        setError("Password is required for new users.");
        return;
      }

      if (form.roles.length === 0) {
        setError("Please select at least one role.");
        return;
      }

      const payload: any = {
        username: form.username,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        roles: form.roles,
      };
      if (form.password) payload.password = form.password;

      let res: any;
      if (editingUser) {
        res = await ApiService.updateUser(editingUser._id, payload);
      } else {
        res = await ApiService.createUser(payload);
      }

      if (!res.success)
        throw new Error(res.message || "Failed to save user.");

      setSuccess(editingUser ? "User updated successfully." : "User created successfully.");
      closeModal();
      loadUsers();
    } catch (e: any) {
      setError(e.message || "Failed to save user.");
    }
  };

  // ------------ Delete / status toggle ------------
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res: any = await ApiService.deleteUser(id);
      if (!res.success)
        throw new Error(res.message || "Failed to delete user.");
      setSuccess("User deleted successfully.");
      loadUsers();
    } catch (e: any) {
      setError(e.message || "Failed to delete user.");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res: any = await ApiService.toggleUserStatus(id);
      if (!res.success)
        throw new Error(res.message || "Failed to update status.");
      setSuccess("User status updated.");
      loadUsers();
    } catch (e: any) {
      setError(e.message || "Failed to update status.");
    }
  };

  // ------------ UI ------------
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-[#F7F9FC]">
        <div className="w-10 h-10 border-[3px] border-[#5B21FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] px-6 py-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6 ">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center">
                <UsersRound className="w-6 h-6 text-[#5B21FF]" />
              </div>
              User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage system users
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#5B21FF] text-white text-sm font-semibold rounded-2xl shadow-md hover:bg-[#4C1FD1] transition"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </header>

        {/* Error / success */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button
              className="text-xs text-red-500"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
            <span>{success}</span>
            <button
              className="text-xs text-emerald-500"
              onClick={() => setSuccess(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs + Search card */}
        <section className="bg-white rounded-3xl shadow-sm border border-[#E4E7F2] px-6 py-5 space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${users.length})` },
              { key: "providers", label: "Providers" },
              { key: "staff", label: "Staff" },
              { key: "techs", label: "Technicians" },
              { key: "admin", label: "Administrators" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  tab === t.key
                    ? "bg-[#5B21FF] text-white shadow-sm"
                    : "bg-[#F3F5FB] text-slate-600 hover:bg-[#E5E7F5]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[#F7F9FC] border border-[#E2E6F3] text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 text-right">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </section>

        {/* Table card */}
        <section className="bg-white rounded-3xl shadow-sm border border-[#E4E7F2] overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] custom-scroll">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F7FB] text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Roles</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Last Login</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-slate-400 text-sm"
                    >
                      No users found.
                    </td>
                  </tr>
                )}

                {filteredUsers.map((u) => (
                  <tr
                    key={u._id}
                    className="border-t border-[#EFF2FB] hover:bg-[#F8FAFF] transition"
                  >
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center text-[11px] font-semibold text-[#5B21FF] uppercase">
                          {u.firstName?.charAt(0)}
                          {u.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-900">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-[13px] text-slate-600">
                      {u.email}
                    </td>

                    {/* Roles */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium ${getRoleChipClasses(
                              role
                            )}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                          u.isActive
                            ? "bg-[#E2F8ED] text-[#17824A] border-[#B7EED3]"
                            : "bg-[#EEF1F7] text-[#6B7280] border-[#D5D9E5]"
                        }`}
                      >
                        {u.isActive ? (
                          <Shield className="w-3.5 h-3.5" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        {u.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Last Login */}
                    <td className="px-6 py-4 text-[11px] text-slate-500">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleString()
                        : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-full text-[#5B21FF] hover:bg-[#EEF0FF] transition"
                          title="Edit user"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-2 rounded-full text-[#E11D48] hover:bg-[#FEE2E2] transition"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E4E7F2] p-6 max-h-[80vh] overflow-y-auto custom-scroll">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  First Name
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                  value={form.firstName}
                  onChange={(e) =>
                    handleFormChange("firstName", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Last Name
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                  value={form.lastName}
                  onChange={(e) =>
                    handleFormChange("lastName", e.target.value)
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Username
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#5B21FF33] disabled:opacity-70"
                  value={form.username}
                  disabled={!!editingUser}
                  onChange={(e) =>
                    handleFormChange("username", e.target.value)
                  }
                />
                {editingUser && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Username cannot be changed.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">
                  Roles
                </label>
                <select
                  multiple
                  className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] h-28 focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                  value={form.roles}
                  onChange={handleRolesChange}
                >
                  <option value="radiologist">Radiologist</option>
                  <option value="provider">Provider</option>
                  <option value="doctor">Doctor</option>
                  <option value="technician">Technician</option>
                  <option value="staff">Staff</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Administrator</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Hold Ctrl / Cmd to select multiple roles.
                </p>
              </div>

              {!editingUser && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-[#E2E6F3] px-3 py-2 text-sm bg-[#F8FAFF] focus:outline-none focus:ring-2 focus:ring-[#5B21FF33]"
                    value={form.password || ""}
                    onChange={(e) =>
                      handleFormChange("password", e.target.value)
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Minimum 8 characters recommended.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-[#E2E6F3] text-sm text-slate-600 bg-[#F8FAFF] hover:bg-[#EEF1FB]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 rounded-xl bg-[#5B21FF] text-sm font-semibold text-white hover:bg-[#4C1FD1]"
              >
                {editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
