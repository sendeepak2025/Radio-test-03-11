/**
 * Radiology Worklist Page - Tailwind CSS Version
 * Production-ready worklist for radiologists
 * Shows pending studies with filters and search
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Assignment as ReportIcon,
  Warning as UrgentIcon,
  CheckCircle as CompleteIcon,
  HourglassEmpty as PendingIcon,
  Person as PatientIcon,
  CalendarToday as DateIcon,
  LocalHospital as ModalityIcon
} from '@mui/icons-material'; // Icons are kept from MUI/icons for convenience

// --- Interfaces (Unchanged) ---
interface Study {
  studyInstanceUID: string;
  patientID: string;
  patientName: string;
  patientAge?: string;
  patientSex?: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  modality: string;
  accessionNumber?: string;
  priority: 'stat' | 'urgent' | 'routine';
  reportStatus: 'pending' | 'draft' | 'final';
  hasAIAnalysis: boolean;
  aiDetectionCount?: number;
}

// --- Helper Components (Tailwind replacements for MUI components) ---

// Custom Chip Component
const Chip: React.FC<{ label: string; color: string; icon?: React.ReactElement; className?: string }> = ({ label, color, icon, className }) => {
    let baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium leading-4";
    let colorClasses = "";

    switch (color) {
        case 'error': colorClasses = 'bg-red-100 text-red-800'; break;
        case 'warning': colorClasses = 'bg-yellow-100 text-yellow-800'; break;
        case 'success': colorClasses = 'bg-green-100 text-green-800'; break;
        case 'info': colorClasses = 'bg-blue-100 text-blue-800'; break;
        case 'default':
        default: colorClasses = 'bg-gray-100 text-gray-800'; break;
    }

    return (
        <span className={`${baseClasses} ${colorClasses} ${className}`}>
            {icon && React.cloneElement(icon, { className: 'w-3 h-3 mr-1', style: { fontSize: '12px' } })}
            {label}
        </span>
    );
};

// Custom Button Component
const Button: React.FC<{
    children: React.ReactNode;
    variant: 'contained' | 'outlined' | 'text';
    color?: 'primary' | 'secondary' | 'success' | 'danger';
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    startIcon?: React.ReactElement;
}> = ({ children, variant, color = 'primary', onClick, disabled, className, startIcon }) => {
    let baseClasses = "inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150";
    let colorClasses = "";

    switch (variant) {
        case 'contained':
            switch (color) {
                case 'primary': colorClasses = 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'; break;
                case 'secondary': colorClasses = 'border-transparent text-white bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'; break;
                case 'success': colorClasses = 'border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'; break;
                case 'danger': colorClasses = 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'; break;
                default: colorClasses = 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'; break;
            }
            break;
        case 'outlined':
            switch (color) {
                case 'primary': colorClasses = 'text-indigo-600 border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500'; break;
                case 'secondary': colorClasses = 'text-gray-600 border-gray-400 hover:bg-gray-50 focus:ring-gray-500'; break;
                default: colorClasses = 'text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-indigo-500'; break;
            }
            break;
        case 'text':
            colorClasses = 'border-transparent text-indigo-600 hover:text-indigo-900';
            break;
    }

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${colorClasses} ${disabledClasses} ${className}`}
        >
            {startIcon && React.cloneElement(startIcon, { className: 'w-4 h-4 mr-2 -ml-1', style: { fontSize: '16px' } })}
            {children}
        </button>
    );
};

// Custom IconButton Component (Tooltip functionality removed for simplicity, can be added with a tooltip library)
const IconButton: React.FC<{
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactElement;
    color?: 'primary' | 'success' | 'default';
    className?: string;
    title: string; // Used for standard HTML tooltip
}> = ({ onClick, children, color = 'default', className, title }) => {
    let colorClasses = "";
    switch (color) {
        case 'primary': colorClasses = 'text-indigo-600 hover:text-indigo-800'; break;
        case 'success': colorClasses = 'text-green-600 hover:text-green-800'; break;
        default: colorClasses = 'text-gray-500 hover:text-gray-700'; break;
    }

    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-1 rounded-full ${colorClasses} transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${className}`}
        >
            {React.cloneElement(children, { className: 'w-5 h-5', style: { fontSize: '20px' } })}
        </button>
    );
};

// --- Main Component ---

const WorklistPage: React.FC = () => {
  // State (Unchanged)
  const [studies, setStudies] = useState<Study[]>([]);
  const [filteredStudies, setFilteredStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Logic (Unchanged)
  const loadStudies = async () => { /* ... loadStudies logic ... */ 
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const response = await axios.get(`${API_URL}/api/worklist`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          status: statusFilter !== 'all' ? statusFilter : 'ALL',
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          startDate: from.toISOString(),
          endDate: now.toISOString()
        }
      });

      const studiesData = response.data.items || [];
      setStudies(studiesData);
      setFilteredStudies(studiesData);
      
      console.log('📋 Loaded', studiesData.length, 'studies');
      
      if (studiesData.length === 0) {
        console.log('📋 No studies found, triggering sync...');
        await syncWorklist();
      }
    } catch (error) {
      console.error('❌ Failed to load studies:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const syncWorklist = async () => { /* ... syncWorklist logic ... */ 
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await axios.post(`${API_URL}/api/worklist/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Sync complete:', response.data);
      
      await loadStudies();
    } catch (error) {
      console.error('❌ Failed to sync worklist:', error);
    }
  };

  useEffect(() => { /* ... Initial load and auto-refresh ... */ 
    loadStudies();

    if (autoRefresh) {
      const interval = setInterval(loadStudies, 15000);
      return () => clearInterval(interval);
    }
  }, [statusFilter, modalityFilter, priorityFilter, autoRefresh]);

  useEffect(() => { /* ... Search and filter ... */ 
    if (!searchTerm) {
      setFilteredStudies(studies);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = studies.filter(study =>
      study.patientName.toLowerCase().includes(term) ||
      study.patientID.toLowerCase().includes(term) ||
      study.studyDescription.toLowerCase().includes(term) ||
      study.accessionNumber?.toLowerCase().includes(term)
    );
    
    setFilteredStudies(filtered);
  }, [searchTerm, studies]);

  const handleOpenStudy = (study: Study) => { /* ... Open study in viewer ... */ 
    window.location.href = `/viewer?studyUID=${study.studyInstanceUID}`;
  };

  const handleCreateReport = (study: Study) => { /* ... Open report editor ... */ 
    const params = new URLSearchParams({
      studyUID: study.studyInstanceUID,
      patientID: study.patientID,
      patientName: study.patientName,
      modality: study.modality
    });
    
    window.location.href = `/reporting?${params.toString()}`;
  };

  const getPriorityColor = (priority: string) => { /* ... Get priority color ... */ 
    switch (priority) {
      case 'stat': return 'error';
      case 'urgent': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => { /* ... Get status color ... */ 
    switch (status) {
      case 'final': return 'success';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  const formatDateTime = (date: string, time: string) => { /* ... Format date/time ... */ 
    try {
      const dateStr = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
      const timeStr = time ? `${time.slice(0,2)}:${time.slice(2,4)}` : '';
      return `${dateStr} ${timeStr}`;
    } catch {
      return date;
    }
  };

  const stats = { /* ... Statistics ... */ 
    total: studies.length,
    pending: studies.filter(s => s.reportStatus === 'pending').length,
    stat: studies.filter(s => s.priority === 'stat').length,
    withAI: studies.filter(s => s.hasAIAnalysis).length
  };

  // --- Render ---

  // Custom Input Field with Label
  const SelectField: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
  }> = ({ label, value, onChange, options }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Custom Stat Card
  const StatCard: React.FC<{ count: number; label: string; colorClass: string }> = ({ count, label, colorClass }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
      <dl>
        <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
        <dd className="mt-1 flex items-baseline">
          <div className={`text-2xl font-semibold ${colorClass}`}>{count}</div>
        </dd>
      </dl>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      {/* Header & Controls */}
      <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">📋</span> Radiology Worklist
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and review medical imaging studies
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <IconButton
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              color={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshIcon />
            </IconButton>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setModalityFilter('all');
                setPriorityFilter('all');
                loadStudies();
              }}
              disabled={loading}
              className="hidden sm:inline-flex"
            >
              Reset Filters
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={loadStudies}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              onClick={syncWorklist}
              disabled={loading}
            >
              Sync Studies
            </Button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard count={stats.total} label="Total Studies" colorClass="text-indigo-600" />
          <StatCard count={stats.pending} label="Pending Reports" colorClass="text-yellow-600" />
          <StatCard count={stats.stat} label="STAT Studies" colorClass="text-red-600" />
          <StatCard count={stats.withAI} label="AI Analyzed" colorClass="text-green-600" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7 lg:grid-cols-12 items-end">
          {/* Search */}
          <div className="md:col-span-3 lg:col-span-4">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search patient name, ID, or accession..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="md:col-span-1 lg:col-span-2">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
          
          {/* Modality Filter */}
          <div className="md:col-span-1 lg:col-span-2">
            <SelectField
              label="Modality"
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'CT', label: 'CT' },
                { value: 'MR', label: 'MR' },
                { value: 'CR', label: 'CR' },
                { value: 'DX', label: 'DX' },
                { value: 'US', label: 'US' },
                { value: 'MG', label: 'MG' },
                { value: 'XA', label: 'XA' },
              ]}
            />
          </div>
          
          {/* Priority Filter */}
          <div className="md:col-span-1 lg:col-span-2">
            <SelectField
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'stat', label: 'STAT' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'routine', label: 'Routine' },
              ]}
            />
          </div>
          
          {/* Results Count */}
          <div className="md:col-span-1 lg:col-span-2">
            <p className="text-sm font-medium text-gray-500 mt-2">
              Showing <span className="font-semibold text-gray-700">{filteredStudies.length}</span> of <span className="font-semibold text-gray-700">{studies.length}</span> studies
            </p>
          </div>
        </div>
      </div>

      {/* Studies Table */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Loading studies...</span>
          </div>
        ) : filteredStudies.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6" role="alert">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    No studies found. Try adjusting your filters or sync studies from PACS.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="contained"
              color="primary"
              onClick={syncWorklist}
              disabled={loading}
              startIcon={<RefreshIcon />}
            >
              Sync Studies from PACS
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study Date/Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modality</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <tr
                    key={study.studyInstanceUID}
                    className={`hover:bg-gray-50 cursor-pointer ${study.priority === 'stat' ? 'bg-red-50' : ''}`}
                    onClick={() => handleOpenStudy(study)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip
                        label={study.priority.toUpperCase()}
                        color={getPriorityColor(study.priority)}
                        icon={study.priority === 'stat' ? <UrgentIcon /> : undefined}
                      />
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{study.patientName}</div>
                      <div className="text-xs text-gray-500">ID: {study.patientID}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(study.studyDate, study.studyTime)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip label={study.modality} color="default" className="border border-gray-300" />
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs" title={study.studyDescription}>
                      {study.studyDescription}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip
                        label={study.reportStatus}
                        color={getStatusColor(study.reportStatus)}
                        icon={
                          study.reportStatus === 'final' ? <CompleteIcon /> :
                          study.reportStatus === 'draft' ? <ReportIcon /> :
                          <PendingIcon />
                        }
                      />
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {study.hasAIAnalysis ? (
                        <div className="relative inline-block">
                          <Chip label="AI" color="success" />
                          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {study.aiDetectionCount || 0}
                          </span>
                        </div>
                      ) : (
                        <Chip label="No AI" color="default" className="border border-gray-300" />
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <IconButton
                          title="Open Viewer"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStudy(study);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                        
                        <IconButton
                          title="Create Report"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateReport(study);
                          }}
                        >
                          <ReportIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorklistPage;