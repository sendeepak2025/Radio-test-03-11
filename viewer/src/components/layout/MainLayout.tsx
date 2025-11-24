import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch } from '../../store/hooks'
import { logout } from '../../store/slices/authSlice'
import { NotificationBell } from '../notifications/NotificationBell'
import { useAuth } from '../../hooks/useAuth'
import MobileNavigation from './MobileNavigation'

import {
  Menu as MenuIcon,
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Monitor,
  PlugZap,
  Building2,
  FlaskConical,
  Shield,
  Stethoscope,
  DollarSign,
} from 'lucide-react'

const LOGO_PATH = '/logo.png'

export const MainLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user, hasAnyRole, hasPermission } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [usersMenuOpen, setUsersMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const currentUser = {
    name:
      user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
        : 'User',
    role: user?.roles?.[0] || 'admin',
    email: user?.email || '',
    hospitalLogo: user?.hospitalLogo || null,
    hospitalId: user?.hospitalId || null,
  }

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap()
    } catch {}
    navigate('/login', { replace: true })
  }

  const isActive = (path) => location.pathname === path
  const isSubMenuActive = (path, submenu) =>
    (path && isActive(path)) || submenu?.some((s) => isActive(s.path))

  const canAccessMenuItem = (item) => {
    if (!item.requiredRoles && !item.requiredPermissions) return true
    if (item.requiredRoles && hasAnyRole(item.requiredRoles)) return true
    if (item.requiredPermissions && item.requiredPermissions.some((p) => hasPermission(p)))
      return true
    return false
  }

  const menuItems = [
    {
      title: 'Main',
      items: [
        { text: 'Dashboard', icon: <LayoutDashboard />, path: '/app/dashboard' },
        { text: 'Worklist', icon: <ClipboardList />, path: '/app/worklist' },
        { text: 'Patients', icon: <Users />, path: '/app/patients' },
        { text: 'Follow Ups', icon: <Calendar />, path: '/app/followups' },
        { text: 'Prior Auth', icon: <Stethoscope />, path: '/app/prior-auth' },
        { text: 'Billing', icon: <DollarSign />, path: '/app/billing' },
      ],
    },
    {
      title: 'System',
      items: [
        {
          text: 'System Monitoring',
          icon: <Monitor />,
          path: '/app/system-monitoring',
          requiredRoles: ['admin', 'system:admin'],
        },
        {
          text: 'Device to PACS Setup',
          icon: <PlugZap />,
          path: '/app/connection-manager',
          requiredRoles: ['admin', 'system:admin', 'technician'],
        },
        {
          text: 'Hospital Setting',
          icon: <Settings />,
          path: '/app/admin/hospital-settings',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          text: 'User Management',
          icon: <Users />,
          requiredRoles: ['admin', 'system:admin'],
          requiredPermissions: ['users:read', 'users:write'],
          submenu: [
            { text: 'All Users', icon: <Users size={16} />, path: '/app/users' },
            { text: 'Providers', icon: <Stethoscope size={16} />, path: '/app/users/providers' },
            { text: 'Staff', icon: <Building2 size={16} />, path: '/app/users/staff' },
            { text: 'Technicians', icon: <FlaskConical size={16} />, path: '/app/users/technicians' },
            { text: 'Administrators', icon: <Shield size={16} />, path: '/app/users/admins' },
          ],
        },
        { text: 'Settings', icon: <Settings />, path: '/app/settings' },
      ],
    },
  ]

  const filteredMenuItems = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessMenuItem(item)),
    }))
    .filter((section) => section.items.length > 0)

  const pageTitle =
    {
      '/app/dashboard': 'Dashboard',
      '/app/worklist': 'Worklist',
      '/app/patients': 'Patients',
      '/app/followups': 'Follow Ups',
      '/app/system-monitoring': 'System Monitoring',
      '/app/billing': 'Billing & Superbills',
      '/app/settings': 'Settings',
    }[location.pathname] ||
    (location.pathname.startsWith('/app/users') ? 'User Management' : 'Radiology System')

  const renderDrawer = (collapsed) => (
    <div className="flex flex-col h-full bg-black">

      {/* LOGO */}
      <div className="h-20 flex items-center px-4 bg-gradient-to-r from-blue-700 to-blue-500">
        {collapsed ? (
          <div className="w-full flex justify-center">
            <img src={LOGO_PATH} className="w-10 h-10 rounded-xl shadow-md" />
          </div>
        ) : (
          <img src={LOGO_PATH} className="h-20 rounded-xl shadow-md" />
        )}
      </div>

      {/* USER AREA */}
      <div className="px-4 py-4 border-b border-blue-900/40 bg-black flex items-center gap-3">

        <div className="w-11 h-11 rounded-full overflow-hidden shadow-md ring-2 ring-blue-400 bg-white">
          <img
            src={currentUser?.hospitalLogo}
            alt="Hospital Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {!collapsed && (
          <div>
            <div className="text-white font-medium">{currentUser.name}</div>
            <div className="text-[11px] bg-blue-800 px-2 py-0.5 rounded text-white">
              {currentUser.role}
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSE BUTTON */}
      <div className="hidden sm:flex items-center justify-end p-2 border-b border-blue-900/40 bg-black">
        <button
          onClick={() => setSidebarCollapsed((p) => !p)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-500"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">

        {filteredMenuItems.map((section, s) => (
          <div key={s} className="mb-3">
            {!collapsed && (
              <div className="px-2 text-[11px] uppercase text-blue-300/80 tracking-wide mb-1">
                {section.title}
              </div>
            )}

            {section.items.map((item, i) => {
              const active = isSubMenuActive(item.path, item.submenu)

              if (item.submenu) {
                return (
                  <div key={i} className="mb-1">
                    <button
                      className={`flex items-center w-full px-3 py-2 rounded-lg transition-all ${
                        active
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow'
                          : 'text-gray-300 hover:bg-gray-900'
                      } ${collapsed ? 'justify-center' : 'gap-3'}`}
                      onClick={() => setUsersMenuOpen((prev) => !prev)}
                    >
                      <span className={`${collapsed ? '' : 'w-6'} flex justify-center`}>
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.text}</span>
                          {usersMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </>
                      )}
                    </button>

                    {!collapsed && usersMenuOpen && (
                      <ul className="ml-7 mt-1 border-l border-blue-700/40 pl-2">
                        {item.submenu.map((sub, si) => (
                          <li key={si}>
                            <button
                              onClick={() => navigate(sub.path)}
                              className={`flex items-center w-full px-2 py-1.5 rounded text-xs mb-1 transition-all ${
                                isActive(sub.path)
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-400 hover:bg-gray-900'
                              }`}
                            >
                              <span className="w-4 flex justify-center">{sub.icon}</span>
                              <span className="ml-2">{sub.text}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              }

              return (
                <div key={i} className="mb-1">
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center w-full px-3 py-2 rounded-lg transition-all ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow'
                        : 'text-gray-300 hover:bg-gray-900'
                    } ${collapsed ? 'justify-center' : 'gap-3'}`}
                  >
                    <span className={`${collapsed ? '' : 'w-6'} flex justify-center`}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.text}</span>}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  const sidebarWidth = sidebarCollapsed ? 'sm:w-20' : 'sm:w-64'
  const sidebarInlineWidth = sidebarCollapsed ? 'w-20' : 'w-64'
  const contentMargin = sidebarCollapsed ? 'sm:ml-20' : 'sm:ml-64'

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 h-16 shadow-sm bg-white border-b z-30 ${contentMargin} transition-all`}>
        <div className="flex items-center h-full px-4 sm:px-6 gap-3">

          <button onClick={handleDrawerToggle} className="sm:hidden text-gray-700">
            <MenuIcon size={22} />
          </button>

          <div className="text-lg font-semibold text-gray-800 flex-1">
            {pageTitle.toUpperCase()}
          </div>

          <NotificationBell />

          <div className="relative">
            <button
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex justify-center items-center shadow ring-2 ring-blue-400"
              onClick={() => setUserMenuOpen((p) => !p)}
            >
              {currentUser.name.charAt(0)}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white shadow-xl rounded-lg border z-40">
                <button
                  className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 w-full text-gray-700"
                  onClick={() => navigate('/profile')}
                >
                  <User size={16} className="mr-2 text-blue-500" /> Profile
                </button>

                <button
                  className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 w-full text-gray-700"
                  onClick={() => navigate('/settings')}
                >
                  <Settings size={16} className="mr-2 text-blue-500" /> Settings
                </button>

                <div className="border-t my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-sm w-full text-red-500 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div onClick={handleDrawerToggle} className="fixed inset-0 bg-black/60 z-40 sm:hidden" />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-black shadow-xl border-r transform transition sm:hidden z-50 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderDrawer(false)}
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden sm:flex fixed top-0 left-0 h-screen bg-black border-r shadow-xl transition-all duration-300 z-20 ${sidebarInlineWidth} ${sidebarWidth}`}
      >
        {renderDrawer(sidebarCollapsed)}
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`mt-16 p-4 sm:p-6 bg-gray-50 flex-1 min-h-[calc(100vh-64px)] overflow-y-auto transition-all ${contentMargin}`}
      >
        {children}
      </main>

      <MobileNavigation />
    </div>
  )
}

export default MainLayout
