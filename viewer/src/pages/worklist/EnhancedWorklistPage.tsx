import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  RefreshCw,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Play,
  User,
  History,
  TrendingUp,
  Download,
  Filter,
  X,
  Loader2,
} from 'lucide-react'
import { apiCall, getCSRFToken } from '../../services/ApiService'
import WorkflowNavigation from '../../components/workflow/WorkflowNavigation'
import { useWorkflow } from '../../contexts/WorkflowContext'
import { ExportButton } from '../../components/export/ExportButton'

// ---- Types ----
interface WorklistItem {
  _id: string
  studyInstanceUID: string
  patientID: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'routine' | 'urgent' | 'stat'
  reportStatus: 'none' | 'draft' | 'finalized'
  hasCriticalFindings: boolean
  assignedTo?: {
    _id: string
    username: string
  }
  scheduledFor?: string
  study?: {
    patientName: string
    studyDate: string
    studyTime: string
    modality: string
    studyDescription: string
  }
}

interface WorklistStats {
  total: number
  byStatus: {
    pending: number
    inProgress: number
    completed: number
  }
  byPriority: {
    stat: number
    urgent: number
    routine: number
  }
  criticalUnnotified: number
}

// ---- Small UI Helpers ----
const Badge: React.FC<{
  children: React.ReactNode
  type: 'warning' | 'info' | 'success' | 'error' | 'default' | 'outlined'
}> = ({ children, type }) => {
  const map: Record<
    string,
    { base: string }
  > = {
    warning: { base: 'bg-amber-100 text-amber-800 border-amber-200' },
    info: { base: 'bg-sky-100 text-sky-800 border-sky-200' },
    success: { base: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    error: { base: 'bg-rose-100 text-rose-800 border-rose-200' },
    outlined: { base: 'bg-white text-slate-700 border-slate-300' },
    default: { base: 'bg-slate-100 text-slate-700 border-slate-200' },
  }

  const cls = map[type]?.base ?? map.default.base

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {children}
    </span>
  )
}

const StatCard: React.FC<{
  title: string
  value: number | string
  accent?: 'yellow' | 'blue' | 'red' | 'slate'
  highlight?: boolean
  description?: string
}> = ({ title, value, accent = 'slate', highlight, description }) => {
  const accentMap: Record<
    string,
    { border: string; title: string; value: string; bg?: string }
  > = {
    yellow: {
      border: 'border-amber-300',
      title: 'text-amber-700',
      value: 'text-amber-600',
    },
    blue: {
      border: 'border-sky-300',
      title: 'text-sky-700',
      value: 'text-sky-600',
    },
    red: {
      border: highlight ? 'border-rose-500' : 'border-rose-300',
      title: highlight ? 'text-rose-800' : 'text-rose-700',
      value: 'text-rose-600',
    },
    slate: {
      border: 'border-slate-200',
      title: 'text-slate-700',
      value: 'text-slate-700',
    },
  }

  const a = accentMap[accent] || accentMap.slate
  const bg =
    accent === 'red' && highlight
      ? 'bg-rose-50'
      : accent === 'slate'
      ? 'bg-white'
      : 'bg-white'

  return (
    <div
      className={`p-4 rounded-xl shadow-sm ${bg} border ${a.border} flex flex-col justify-between`}
    >
      <div className={`text-xs font-medium ${a.title}`}>{title}</div>
      <div className={`mt-1 text-2xl font-semibold ${a.value}`}>{value}</div>
      {description && (
        <div className="mt-1 text-[11px] text-slate-400">{description}</div>
      )}
    </div>
  )
}

const EnhancedWorklistPage: React.FC = () => {
  const navigate = useNavigate()
  const { setCurrentStudy, addToHistory } = useWorkflow()

  const [activeTab, setActiveTab] = useState(0)
  const [items, setItems] = useState<WorklistItem[]>([])
  const [filteredItems, setFilteredItems] = useState<WorklistItem[]>([])
  const [stats, setStats] = useState<WorklistStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null)
  const [syncDialog, setSyncDialog] = useState(false)

  // ---- Fetch data ----
  useEffect(() => {
    fetchWorklist()
    fetchStats()
  }, [])

  useEffect(() => {
    filterItems()
  }, [activeTab, searchQuery, priorityFilter, items])

  const fetchWorklist = async () => {
    setLoading(true)
    try {
      getCSRFToken() // if your apiCall needs it internally
      const response = await apiCall('/api/worklist')
      const data = await response.json()
      if (data.success) {
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch worklist:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/worklist/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const filterItems = () => {
    let filtered = [...items]

    // Tab → status filter
    if (activeTab === 0) filtered = filtered.filter((i) => i.status === 'pending')
    else if (activeTab === 1)
      filtered = filtered.filter((i) => i.status === 'in_progress')
    else if (activeTab === 2)
      filtered = filtered.filter((i) => i.status === 'completed')
    else if (activeTab === 3)
      filtered = filtered.filter((i) => i.hasCriticalFindings)

    // Priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((i) => i.priority === priorityFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.study?.patientName?.toLowerCase().includes(q) ||
          i.patientID?.toLowerCase().includes(q) ||
          i.study?.studyDescription?.toLowerCase().includes(q)
      )
    }

    // Sort by priority + schedule
    const priorityOrder: Record<'stat' | 'urgent' | 'routine', number> = {
      stat: 3,
      urgent: 2,
      routine: 1,
    }

    filtered.sort((a, b) => {
      const pDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (pDiff !== 0) return pDiff
      return (
        new Date(a.scheduledFor || 0).getTime() -
        new Date(b.scheduledFor || 0).getTime()
      )
    })

    setFilteredItems(filtered)
  }

  // ---- Actions ----
  const handleViewStudy = (item: WorklistItem) => {
    setCurrentStudy({
      studyInstanceUID: item.studyInstanceUID,
      patientName: item.study?.patientName || '',
      modality: item.study?.modality || '',
      studyDate: item.study?.studyDate || '',
    })
    addToHistory('worklist')
    navigate(`/app/viewer/${item.studyInstanceUID}`)
  }

  const updateStatus = async (item: WorklistItem, status: 'in_progress' | 'completed') => {
    try {
      const response = await fetch(
        `/api/worklist/${item.studyInstanceUID}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ status }),
        }
      )

      if (response.ok) {
        await fetchWorklist()
        if (status === 'in_progress') {
          handleViewStudy(item)
        } else {
          fetchStats()
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleStartReading = (item: WorklistItem) => {
    updateStatus(item, 'in_progress')
  }

  const handleMarkComplete = (item: WorklistItem) => {
    updateStatus(item, 'completed')
  }

  const handleSyncWorklist = async () => {
    try {
      getCSRFToken()
      const response = await apiCall('/api/worklist/sync', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        alert(
          `Synced ${data.created} new studies, ${data.skipped} already existed`
        )
        fetchWorklist()
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to sync worklist:', error)
    } finally {
      setSyncDialog(false)
    }
  }

  const handleExportWorklist = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        includeStats: 'true',
      })

      const response = await fetch(`/api/worklist/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `worklist-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      alert('✅ Worklist exported successfully!')
    } catch (error: any) {
      alert(`❌ Export failed: ${error.message}`)
    }
  }

  // ---- Style helpers ----
  const getPriorityColor = (
    priority: WorklistItem['priority']
  ): 'error' | 'warning' | 'default' => {
    if (priority === 'stat') return 'error'
    if (priority === 'urgent') return 'warning'
    return 'default'
  }

  const getReportStatusColor = (
    status: WorklistItem['reportStatus']
  ): 'success' | 'info' | 'default' => {
    if (status === 'finalized') return 'success'
    if (status === 'draft') return 'info'
    return 'default'
  }

  const getStatusColor = (
    status: WorklistItem['status']
  ): 'success' | 'info' | 'warning' => {
    if (status === 'completed') return 'success'
    if (status === 'in_progress') return 'info'
    return 'warning'
  }

  // ---- Render ----
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top workflow nav */}
      

      <div className="p-4 md:p-6 lg:p-8 flex-1">
        {/* Header & actions */}
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-7 h-7 text-indigo-600" />
                Radiology Worklist
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Manage and triage your studies with real-time status, priority
                and reporting.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                className="inline-flex items-center px-3 py-2 text-xs md:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
                onClick={handleExportWorklist}
              >
                <Download size={16} className="mr-2" />
                Export
              </button>

              <button
                className="inline-flex items-center px-3 py-2 text-xs md:text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-sm"
                onClick={fetchWorklist}
                disabled={loading}
              >
                {loading ? (
                  <Loader2
                    size={16}
                    className="mr-2 animate-spin text-indigo-500"
                  />
                ) : (
                  <RefreshCw size={16} className="mr-2" />
                )}
                Refresh
              </button>

              <button
                className="inline-flex items-center px-3 py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700"
                onClick={() => setSyncDialog(true)}
              >
                <TrendingUp size={16} className="mr-2" />
                Sync Studies
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard
                title="Pending"
                value={stats.byStatus.pending}
                accent="yellow"
                description="Waiting to be read"
              />
              <StatCard
                title="In Progress"
                value={stats.byStatus.inProgress}
                accent="blue"
                description="Currently being read"
              />
              <StatCard
                title="STAT / Urgent"
                value={stats.byPriority.stat + stats.byPriority.urgent}
                accent="red"
                highlight
                description="High-priority cases"
              />
              <StatCard
                title="Critical (Unnotified)"
                value={stats.criticalUnnotified}
                accent={stats.criticalUnnotified > 0 ? 'red' : 'slate'}
                highlight={stats.criticalUnnotified > 0}
                description="Needs immediate communication"
              />
            </div>
          )}

          {/* Search & filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                placeholder="Search by patient name, ID, or study description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                className="appearance-none w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="stat">STAT</option>
                <option value="urgent">Urgent</option>
                <option value="routine">Routine</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12l-4-4h8l-4 4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {[
              {
                id: 0,
                label: 'Pending',
                icon: Clock,
                count: stats?.byStatus.pending,
                type: 'warning' as const,
              },
              {
                id: 1,
                label: 'In Progress',
                icon: Play,
                count: stats?.byStatus.inProgress,
                type: 'info' as const,
              },
              {
                id: 2,
                label: 'Completed',
                icon: CheckCircle,
                count: stats?.byStatus.completed,
                type: 'success' as const,
              },
              {
                id: 3,
                label: 'Critical',
                icon: AlertTriangle,
                count: stats?.criticalUnnotified,
                type: 'error' as const,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              const pillClass =
                tab.type === 'warning'
                  ? 'bg-amber-100 text-amber-800'
                  : tab.type === 'info'
                  ? 'bg-sky-100 text-sky-800'
                  : tab.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 whitespace-nowrap py-3 text-sm border-b-2 transition ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`ml-1 hidden md:inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${pillClass}`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Worklist table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
          {stats?.criticalUnnotified > 0 && (
            <div className="flex items-center gap-2 bg-rose-50 border-l-4 border-rose-500 px-4 py-3 text-sm text-rose-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">
                  {stats.criticalUnnotified} critical finding(s) need
                  communication.
                </p>
                <p className="text-[11px] text-rose-600">
                  Please ensure communication is documented as per policy.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Priority',
                    'Status',
                    'Patient Name',
                    'Patient ID',
                    'Study Date',
                    'Modality',
                    'Description',
                    'Report',
                    'Assigned To',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 md:px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      <Loader2 className="w-7 h-7 mx-auto animate-spin text-indigo-500" />
                      <p className="mt-2 text-xs">
                        Loading worklist, please wait...
                      </p>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      <p className="text-sm font-medium">
                        No studies found in this view.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try changing filters or search query.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item._id}
                      className={`transition cursor-pointer ${
                        item.hasCriticalFindings
                          ? 'bg-rose-50/70 hover:bg-rose-100'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleViewStudy(item)}
                    >
                      {/* Priority */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                        <Badge type={getPriorityColor(item.priority)}>
                          {item.hasCriticalFindings && (
                            <AlertTriangle
                              size={14}
                              className="mr-1 text-rose-600"
                            />
                          )}
                          {item.priority.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                        <Badge type={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>

                      {/* Patient name */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap font-semibold text-slate-900">
                        {item.study?.patientName || 'Unknown'}
                      </td>

                      {/* Patient ID */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap text-slate-500">
                        {item.patientID || '—'}
                      </td>

                      {/* Study date */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{item.study?.studyDate || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Modality */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                        <Badge type="outlined">
                          {item.study?.modality || 'N/A'}
                        </Badge>
                      </td>

                      {/* Description */}
                      <td
                        className="px-4 md:px-6 py-3 max-w-xs truncate text-slate-500"
                        title={item.study?.studyDescription}
                      >
                        {item.study?.studyDescription || 'N/A'}
                      </td>

                      {/* Report status */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                        <Badge type={getReportStatusColor(item.reportStatus)}>
                          {item.reportStatus === 'finalized'
                            ? 'Finalized'
                            : item.reportStatus === 'draft'
                            ? 'Draft'
                            : 'No Report'}
                        </Badge>
                      </td>

                      {/* Assigned to */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                        {item.assignedTo ? (
                          <Badge type="default">
                            <User size={14} className="mr-1" />
                            {item.assignedTo.username}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 'pending' && (
                            <button
                              className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartReading(item)
                              }}
                              title="Start Reading"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewStudy(item)
                            }}
                            title="View Study"
                          >
                            <Eye size={16} />
                          </button>
                          {item.status !== 'completed' && (
                            <button
                              className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkComplete(item)
                              }}
                              title="Mark Complete"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAnchorEl(e.currentTarget)
                              setSelectedItem(item)
                            }}
                            title="More options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {anchorEl && selectedItem && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-56 text-sm"
          style={{
            top: anchorEl.getBoundingClientRect().bottom + 8,
            left: anchorEl.getBoundingClientRect().left - 160,
          }}
          tabIndex={-1}
          onBlur={() => setAnchorEl(null)}
        >
          <button
            className="flex items-center w-full px-4 py-2 hover:bg-slate-50 text-slate-700"
            onClick={() => {
              handleViewStudy(selectedItem)
              setAnchorEl(null)
            }}
          >
            <Eye size={16} className="mr-2 text-indigo-500" />
            Open in Viewer
          </button>
          <button
            className="flex items-center w-full px-4 py-2 hover:bg-slate-50 text-slate-700"
            onClick={() => {
              navigate(`/reporting?study=${selectedItem.studyInstanceUID}`)
              setAnchorEl(null)
            }}
          >
            <FileText size={16} className="mr-2 text-emerald-500" />
            Create / Edit Report
          </button>
          <button
            className="flex items-center w-full px-4 py-2 hover:bg-slate-50 text-slate-700"
            onClick={() => {
              navigate(`/reports/patient/${selectedItem.patientID}`)
              setAnchorEl(null)
            }}
          >
            <History size={16} className="mr-2 text-sky-500" />
            View Prior Studies
          </button>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-2 py-1.5">
            <ExportButton
              type="study"
              id={selectedItem.studyInstanceUID}
              label="Export Study"
              className="flex w-full items-center gap-2 px-2 py-1 rounded-md text-slate-700 hover:bg-slate-50 text-xs font-medium"
            />
          </div>
        </div>
      )}

      {/* Sync dialog */}
      {syncDialog && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center"
          onClick={() => setSyncDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Sync Worklist
              </h2>
              <button
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                onClick={() => setSyncDialog(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5">
              <p className="text-sm text-slate-600 mb-3">
                This will pull new studies from the PACS / database and create
                worklist entries for studies that do not already exist.
              </p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Depending on the number of new studies and PACS connectivity,
                  this can take a short while to complete.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 text-xs md:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                onClick={() => setSyncDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                onClick={handleSyncWorklist}
              >
                Sync Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedWorklistPage
