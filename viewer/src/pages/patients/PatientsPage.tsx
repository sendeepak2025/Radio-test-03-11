"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  X,
  UploadCloud,
  Image,
  Folder,
  ChevronRight,
  AlertTriangle,
  Upload,
  CheckCircle,
  Download,
  FileDown,
  Search,
  Mic,
  LayoutGrid,
  List,
  Calendar,
} from "lucide-react";

import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

import {
  getPatients,
  getPatientStudies,
  createPatient,
  uploadDicomFileForPatient,
  uploadPacsStudy,
  exportPatientData,
  exportStudyData,
  exportAndBurnToCD,
} from "../../services/ApiService";

import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardFooter } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

// ---------------- Types ----------------
interface PatientItem {
  patientID: string;
  patientName: string;
  birthDate?: string;
  sex?: string;
  studyCount?: number;
}

interface PatientStudyItem {
  studyInstanceUID: string;
  patientName: string;
  patientID: string;
  modality: string;
  numberOfSeries: number;
  numberOfInstances: number;
  studyDescription?: string;
  studyDate?: string;
}

// -------- DatePicker Wrapper (simple HTML date) --------
interface DatePickerProps {
  label: string;
  selectedDate: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  selectedDate,
  onChange,
  placeholder = "Select date",
  fullWidth = true,
}) => {
  return (
    <div className={fullWidth ? "w-full" : ""}>
      <label className="text-sm font-medium text-gray-700 block mb-1">
        {label}
      </label>
      <Input
        type="date"
        value={selectedDate ? selectedDate.toISOString().substring(0, 10) : ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value ? new Date(e.target.value) : undefined)
        }
        placeholder={placeholder}
        fullWidth
        startIcon={<Calendar className="w-5 h-5 text-gray-400" />}
      />
    </div>
  );
};

// ================= MAIN COMPONENT ==================
const PatientsPage: React.FC = () => {
  const navigate = useNavigate();

  // Core data
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatientID, setSelectedPatientID] = useState<string | null>(
    null
  );
  const [studiesForPatient, setStudiesForPatient] = useState<
    PatientStudyItem[]
  >([]);

  // State: loading
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingPatientStudies, setLoadingPatientStudies] = useState(false);

  // Add patient modal
  const [addOpen, setAddOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientBirthDate, setNewPatientBirthDate] = useState<
    Date | undefined
  >(undefined);
  const [newPatientSex, setNewPatientSex] = useState("");
  const [addingPatient, setAddingPatient] = useState(false);

  // Studies modal
  const [studiesPopupOpen, setStudiesPopupOpen] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // PACS upload modal
  const [pacsUploadOpen, setPacsUploadOpen] = useState(false);
  const [pacsFiles, setPacsFiles] = useState<File[]>([]);
  const [pacsUploading, setPacsUploading] = useState(false);
  const [pacsUploadSuccess, setPacsUploadSuccess] = useState(false);
  const [uploadedStudyUID, setUploadedStudyUID] = useState<string | null>(null);

  // Export dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<{
    type: "patient" | "study";
    id: string;
  } | null>(null);
  const [includeImages, setIncludeImages] = useState(true);
  const [exportMode, setExportMode] = useState<"download" | "burn-cd">(
    "download"
  );
  const [cdDriveLetter, setCdDriveLetter] = useState("");
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterSex, setFilterSex] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Voice search
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Voice support check
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Load patients on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        setError(null);
        const res = await getPatients();
        if (!res.success)
          throw new Error(res.message || "Failed to load patients");
        setPatients(res.data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingPatients(false);
      }
    };
    loadPatients();
  }, []);

  // Selected patient object
  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientID === selectedPatientID) || null,
    [patients, selectedPatientID]
  );

  // Filter + sort patients
  const filteredPatients = useMemo(() => {
    let filtered = patients.filter((patient) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        patient.patientName
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        patient.patientID
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase());

      const matchesSex = filterSex === "all" || patient.sex === filterSex;

      return matchesSearch && matchesSex;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.patientName || "").localeCompare(b.patientName || "");
        case "id":
          return a.patientID.localeCompare(b.patientID);
        case "studies":
          return (b.studyCount || 0) - (a.studyCount || 0);
        case "date":
          return (b.birthDate || "").localeCompare(a.birthDate || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [patients, debouncedSearchTerm, filterSex, sortBy]);

  // Format date to DICOM format
  const formatDateToYYYYMMDD = (date: Date | undefined): string => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  };

  // Voice search handler
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      setError(`Voice recognition error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Add patient modal handlers
  const handleAddPatientOpen = () => setAddOpen(true);
  const handleAddPatientClose = () => {
    setAddOpen(false);
    setNewPatientName("");
    setNewPatientBirthDate(undefined);
    setNewPatientSex("");
  };

  const handleAddPatientSubmit = async () => {
    const birthDateString = formatDateToYYYYMMDD(newPatientBirthDate);

    try {
      if (!newPatientName.trim() || !newPatientSex.trim()) {
        throw new Error("Patient Name and Sex are required.");
      }

      setAddingPatient(true);
      setError(null);

      const res = await createPatient({
        patientName: newPatientName.trim(),
        birthDate: birthDateString,
        sex: newPatientSex.trim(),
      });

      if (!res.success)
        throw new Error(res.message || "Failed to create patient");

      const list = await getPatients();
      setPatients(list.data || []);
      handleAddPatientClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingPatient(false);
    }
  };

  // Studies modal + load
  const handlePatientClick = async (patientID: string) => {
    try {
      setSelectedPatientID(patientID);
      setStudiesPopupOpen(true);
      setLoadingPatientStudies(true);
      setError(null);

      const res = await getPatientStudies(patientID);
      if (!res.success)
        throw new Error(res.message || "Failed to load studies for patient");

      setStudiesForPatient(res.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingPatientStudies(false);
    }
  };

  const handleStudyClick = (studyUID: string) => {
    navigate(`/app/patient/studies/${studyUID}`);
  };

  const handleUploadDicom = async () => {
    try {
      if (!selectedPatientID || !uploadFileObj) return;
      setUploading(true);
      setError(null);

      const res = await uploadDicomFileForPatient(
        uploadFileObj,
        selectedPatientID
      );
      if (!res.success) throw new Error(res.message || "Upload failed");

      const studies = await getPatientStudies(selectedPatientID);
      setStudiesForPatient(studies.data || []);
      setUploadFileObj(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  // PACS upload handlers
  const handlePacsUploadOpen = () => {
    setPacsUploadOpen(true);
    setPacsUploadSuccess(false);
    setUploadedStudyUID(null);
  };

  const handlePacsUploadClose = () => {
    setPacsUploadOpen(false);
    setPacsFiles([]);
    setPacsUploadSuccess(false);
    setUploadedStudyUID(null);
  };

  const handlePacsFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPacsFiles(files);
  };

  const handlePacsUpload = async () => {
    if (pacsFiles.length === 0) return;

    try {
      setPacsUploading(true);
      setError(null);

      const result = await uploadPacsStudy(pacsFiles);

      if (!result.success) {
        throw new Error(result.message || "PACS upload failed");
      }

      setPacsUploadSuccess(true);
      setUploadedStudyUID(result.data?.studyInstanceUID || null);

      const updatedPatients = await getPatients();
      setPatients(updatedPatients.data || []);

      setTimeout(() => {
        handlePacsUploadClose();
        if (result.data?.studyInstanceUID) {
          navigate(`/app/patient/studies/${result.data.studyInstanceUID}`);
        }
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPacsUploading(false);
    }
  };

  // Export handlers
  const handleExportPatient = (patientID: string) => {
    setExportTarget({ type: "patient", id: patientID });
    setExportDialogOpen(true);
  };

  const handleExportStudy = (studyUID: string) => {
    setExportTarget({ type: "study", id: studyUID });
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    if (!exportTarget) return;

    try {
      setExporting(true);
      setError(null);
      setSuccess(null);

      if (exportMode === "burn-cd") {
        const burnResult = await exportAndBurnToCD({
          targetType: exportTarget.type,
          targetId: exportTarget.id,
          includeImages,
          driveLetter: cdDriveLetter || undefined,
        });

        const burnMessage =
          burnResult?.cdBurn?.status === "completed"
            ? "CD burn completed successfully."
            : burnResult?.cdBurn?.message ||
              "Export prepared. Direct burn was not completed.";

        setSuccess(
          `${burnMessage} ZIP: ${burnResult?.export?.zipFileName || "prepared"}`
        );
      } else {
        if (exportTarget.type === "patient") {
          await exportPatientData(exportTarget.id, includeImages, "zip");
        } else {
          await exportStudyData(exportTarget.id, includeImages, "zip");
        }
        setSuccess("Export downloaded successfully.");
      }

      setExportDialogOpen(false);
      setExportTarget(null);
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportClose = () => {
    setExportDialogOpen(false);
    setExportTarget(null);
    setIncludeImages(true);
    setExportMode("download");
    setCdDriveLetter("");
  };

  // ===================== RENDER =========================
  return (
    <>
      <Helmet>
        <title>Patients</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-6 sm:p-8 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
                <Users className="w-8 h-8 text-primary-600" />
                Patients Records
              </h1>
              <p className="text-gray-600 text-lg">
                Manage patient records and medical studies efficiently
              </p>
            </div>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <Button
                variant="outline"
                size="lg"
                startIcon={<Upload />}
                onClick={handlePacsUploadOpen}
                className="shadow-sm"
              >
                Upload Study
              </Button>
              <Button
                variant="primary"
                size="lg"
                startIcon={<Plus />}
                onClick={handleAddPatientOpen}
                className="shadow-md hover:shadow-lg"
              >
                Add Patient
              </Button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white p-6 mb-6 border border-gray-200 rounded-xl shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              {/* Search */}
              <div className="col-span-1 sm:col-span-2 md:col-span-2">
                <Input
                  label="Search"
                  fullWidth
                  placeholder="Search by patient name or ID..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  startIcon={<Search className="w-5 h-5 text-gray-400" />}
                  endIcon={
                    searchTerm || isListening ? (
                      isListening ? (
                        <div className="animate-pulse rounded-full h-4 w-4 bg-red-500" />
                      ) : (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )
                    ) : (
                      voiceSupported && (
                        <button
                          onClick={handleVoiceSearch}
                          disabled={isListening}
                          title="Voice Search"
                          className={`p-1 rounded-full transition-colors duration-200 ${
                            isListening
                              ? "bg-red-500 text-white"
                              : "text-primary hover:bg-primary-100"
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )
                    )
                  }
                />
              </div>

              {/* Sex filter */}
              <div>
                <Select
                  label="Filter by Sex"
                  value={filterSex}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilterSex(e.target.value)
                  }
                  options={[
                    { value: "all", label: "All Sexes" },
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "O", label: "Other" },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>

              {/* Sort + View mode */}
              <div className="flex items-center gap-4 col-span-1 md:col-span-1">
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSortBy(e.target.value)
                  }
                  options={[
                    { value: "date", label: "Birth Date (Newest)" },
                    { value: "name", label: "Name (A-Z)" },
                    { value: "id", label: "Patient ID" },
                    { value: "studies", label: "Study Count" },
                  ]}
                  fullWidth
                  size="sm"
                />

                <div className="flex-shrink-0 flex gap-1 border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === "grid"
                        ? "bg-primary-600 text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    title="List View"
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === "list"
                        ? "bg-primary-600 text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filters */}
            {(debouncedSearchTerm || filterSex !== "all") && (
              <div className="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600 font-semibold">
                  Active filters:
                </span>
                {debouncedSearchTerm && (
                  <Badge
                    label={`Search: "${debouncedSearchTerm}"`}
                    onDelete={() => setSearchTerm("")}
                    color="primary"
                    size="small"
                  />
                )}
                {filterSex !== "all" && (
                  <Badge
                    label={`Sex: ${
                      filterSex === "M"
                        ? "Male"
                        : filterSex === "F"
                        ? "Female"
                        : "Other"
                    }`}
                    onDelete={() => setFilterSex("all")}
                    color="secondary"
                    size="small"
                  />
                )}
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterSex("all");
                  }}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium ml-2"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Count */}
          <div className="mb-4 text-gray-600 text-sm font-medium">
            Showing {filteredPatients.length} of {patients.length} patients
          </div>

          {/* Patients area */}
          {loadingPatients ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <Card
                  key={patient.patientID}
                  actionable
                  onClick={() => handlePatientClick(patient.patientID)}
                  className="hover:shadow-xl transition-all duration-300"
                >
                  <CardBody className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-extrabold border-2 border-primary-300">
                        {patient.patientName?.charAt(0) ||
                          patient.patientID.charAt(0)}
                      </div>
                      <Badge
                        label={`${patient.studyCount || 0} studies`}
                        color="primary"
                        size="medium"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1 truncate">
                      {patient.patientName || "Unknown Patient"}
                    </h2>
                    <p className="text-gray-600 text-sm font-mono mb-1">
                      ID: {patient.patientID}
                    </p>
                    {patient.birthDate && (
                      <p className="text-gray-500 text-xs mb-1">
                        DOB: {patient.birthDate}
                      </p>
                    )}
                    {patient.sex && (
                      <p className="text-gray-500 text-xs">Sex: {patient.sex}</p>
                    )}
                  </CardBody>
                  <CardFooter className="flex justify-end p-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      startIcon={<Download className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPatient(patient.patientID);
                      }}
                      className="text-primary-600 hover:bg-primary-50"
                    >
                      Export
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      endIcon={<ChevronRight className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePatientClick(patient.patientID);
                      }}
                      className="ml-2"
                    >
                      View Studies
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              {filteredPatients.length === 0 && (
                <div className="col-span-full text-center py-10">
                  {patients.length > 0 ? (
                    <>
                      <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-2xl font-semibold text-gray-600 mb-2">
                        No patients match your search
                      </p>
                      <p className="text-gray-500 mb-4">
                        Try adjusting your filters or search query
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterSex("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-2xl font-semibold text-gray-600 mb-2">
                        No patients found
                      </p>
                      <p className="text-gray-500">
                        Add your first patient to get started
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.patientID}
                  className="transition-all duration-150 ease-in-out hover:bg-primary-50"
                >
                  <button
                    onClick={() => handlePatientClick(patient.patientID)}
                    className="flex items-center w-full px-6 py-4 text-left group"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-bold mr-4">
                      {patient.patientName?.charAt(0) ||
                        patient.patientID.charAt(0)}
                    </div>
                    <div className="flex-grow grid grid-cols-3 items-center">
                      <div className="col-span-1">
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-700 transition-colors">
                          {patient.patientName || "Unknown Patient"}
                        </h3>
                        <p className="text-gray-600 text-sm font-mono">
                          ID: {patient.patientID}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center gap-4">
                        <Badge
                          label={`${patient.studyCount || 0} studies`}
                          color="primary"
                          size="small"
                        />
                        {patient.sex && (
                          <Badge
                            label={
                              patient.sex === "M"
                                ? "Male"
                                : patient.sex === "F"
                                ? "Female"
                                : "Other"
                            }
                            variant="outlined"
                            size="small"
                            color="secondary"
                          />
                        )}
                      </div>
                      <div className="col-span-1 text-sm text-gray-500">
                        {patient.birthDate && (
                          <p>DOB: {patient.birthDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportPatient(patient.patientID);
                        }}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-primary-600 transition-colors duration-150"
                        title="Download Patient Data"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </button>
                </div>
              ))}

              {filteredPatients.length === 0 && (
                <div className="text-center py-10">
                  {patients.length > 0 ? (
                    <>
                      <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-2xl font-semibold text-gray-600 mb-2">
                        No patients match your search
                      </p>
                      <p className="text-gray-500 mb-4">
                        Try adjusting your filters or search query
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterSex("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-2xl font-semibold text-gray-600 mb-2">
                        No patients found
                      </p>
                      <p className="text-gray-500">
                        Add your first patient to get started
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Studies Modal */}
      <Modal
        isOpen={studiesPopupOpen}
        onClose={() => {
          setStudiesPopupOpen(false);
          setUploadFileObj(null);
        }}
        title={selectedPatient?.patientName || "Unknown Patient"}
        description={`Patient ID: ${selectedPatientID}${
          selectedPatient?.birthDate ? ` (DOB: ${selectedPatient.birthDate})` : ""
        }`}
        maxWidth="lg"
      >
        <div className="-mx-6 -mt-6 p-4 bg-gray-50 border-b border-gray-200 rounded-t-xl">
          <h4 className="text-lg font-bold text-gray-800 mb-3">
            Upload DICOM File
          </h4>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <label
              className={`flex-grow flex flex-col items-center justify-center p-6 border-2 ${
                uploadFileObj
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-dashed border-gray-300 text-gray-600 bg-white"
              } rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors duration-200`}
            >
              <UploadCloud className="w-8 h-8 mb-2" />
              {uploadFileObj ? (
                <div>
                  <p className="font-bold text-green-700 text-sm">
                    {uploadFileObj.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadFileObj.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm">Choose DICOM file</p>
                  <p className="text-xs text-gray-500">Click to browse</p>
                </div>
              )}
              <input
                type="file"
                hidden
                accept="*/*"
                onChange={(e) =>
                  setUploadFileObj(e.target.files?.[0] || null)
                }
              />
            </label>
            <Button
              onClick={handleUploadDicom}
              disabled={!uploadFileObj || uploading}
              startIcon={<UploadCloud className="w-5 h-5" />}
              loading={uploading}
              className="min-w-[120px] shadow-sm"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        <div className="-mx-6 p-4">
          <h4 className="text-lg font-bold text-gray-800 mb-3 px-6">
            Medical Studies ({studiesForPatient.length})
          </h4>

          {loadingPatientStudies ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : studiesForPatient.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto px-6">
              {studiesForPatient.map((study) => (
                <div
                  key={study.studyInstanceUID}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary-500 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div
                    onClick={() => handleStudyClick(study.studyInstanceUID)}
                    className="p-4 flex justify-between items-start"
                  >
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          label={study.modality}
                          color="primary"
                          size="small"
                        />
                        <p className="text-base font-bold text-gray-800 truncate max-w-xs">
                          {study.studyDescription || "Untitled Study"}
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 mb-2">
                        <p className="inline-flex items-center">
                          <Image className="w-4 h-4 mr-1 text-gray-500" />
                          {study.numberOfInstances} images
                        </p>
                        <p className="inline-flex items-center">
                          <Folder className="w-4 h-4 mr-1 text-gray-500" />
                          {study.numberOfSeries} series
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 font-mono break-all max-w-full">
                        UID: {study.studyInstanceUID}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportStudy(study.studyInstanceUID);
                        }}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors duration-150"
                        title="Download Study Data"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 px-6">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">No studies found</p>
              <p className="text-gray-500 text-sm">
                Upload a DICOM file above to create a new study
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Patient Modal */}
      <Modal
        isOpen={addOpen}
        onClose={handleAddPatientClose}
        title="Add New Patient"
        description="Enter essential patient information"
        maxWidth="sm"
      >
        <div className="space-y-5">
          <Input
            label="Patient Name (Required)"
            value={newPatientName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewPatientName(e.target.value)
            }
            fullWidth
            required
          />

          <DatePicker
            label="Birth Date (Optional)"
            selectedDate={newPatientBirthDate}
            onChange={setNewPatientBirthDate}
            placeholder="Select date"
            fullWidth
          />

          <Select
            label="Sex (Required)"
            value={newPatientSex}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setNewPatientSex(e.target.value)
            }
            options={[
              { value: "", label: "Select Sex" },
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
              { value: "O", label: "Other" },
            ]}
            fullWidth
            required
            size="md"
          />
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleAddPatientClose}
            disabled={addingPatient}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddPatientSubmit}
            disabled={
              addingPatient || !newPatientName.trim() || !newPatientSex.trim()
            }
            loading={addingPatient}
            startIcon={<Plus />}
          >
            {addingPatient ? "Saving..." : "Save Patient"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* PACS Upload Modal */}
      <Modal
        isOpen={pacsUploadOpen}
        onClose={handlePacsUploadClose}
        title={pacsUploadSuccess ? "Upload Successful! 🎉" : "Upload DICOM Study"}
        description={
          pacsUploadSuccess
            ? "Study uploaded and ready for viewing"
            : "Upload DICOM files directly to PACS server"
        }
        titleBgClass={pacsUploadSuccess ? "bg-green-600" : "bg-primary-600"}
        maxWidth="lg"
      >
        {pacsUploadSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
            <h4 className="text-2xl font-bold text-gray-800 mb-2">
              Study Uploaded Successfully!
            </h4>
            <p className="text-gray-600 mb-4">
              {pacsFiles.length} file(s) processed
            </p>
            {uploadedStudyUID && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200 mx-auto max-w-sm">
                <p className="text-sm text-gray-600 mb-1 font-semibold">
                  Study UID:
                </p>
                <p className="text-base font-mono text-gray-800 break-all">
                  {uploadedStudyUID}
                </p>
              </div>
            )}
            <p className="text-primary-600 mt-6 text-sm font-semibold">
              Redirecting to viewer...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer bg-gray-50 hover:border-primary-500 hover:bg-primary-50 transition-colors duration-200">
              <input
                type="file"
                hidden
                multiple
                accept=".dcm,application/dicom"
                onChange={handlePacsFileSelect}
              />
              <UploadCloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-800 mb-2">
                {pacsFiles.length > 0
                  ? `Selected: ${pacsFiles.length} file(s)`
                  : "Choose DICOM Files"}
              </p>
              <p className="text-gray-600 text-sm">
                Click to browse or drag and drop DICOM files here
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supports .dcm files and multi-frame DICOM
              </p>
            </label>

            {pacsFiles.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  Selected Files:
                </h4>
                <div className="bg-white border border-gray-200 rounded-md max-h-48 overflow-y-auto p-4 space-y-2">
                  {pacsFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Image className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <p className="text-sm text-gray-800 truncate">
                          {file.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 flex-shrink-0 ml-4">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Alert severity="info" icon={<UploadCloud />}>
              <p className="font-bold text-sm">Direct PACS Upload:</p>
              <p className="text-sm">
                Files will be uploaded to the PACS server and will appear in the
                patient list shortly.
              </p>
            </Alert>
          </div>
        )}

        {!pacsUploadSuccess && (
          <ModalFooter>
            <Button
              variant="outline"
              onClick={handlePacsUploadClose}
              disabled={pacsUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePacsUpload}
              disabled={pacsFiles.length === 0 || pacsUploading}
              loading={pacsUploading}
              startIcon={<Upload className="w-4 h-4" />}
            >
              {pacsUploading
                ? "Uploading..."
                : `Upload ${pacsFiles.length} File(s)`}
            </Button>
          </ModalFooter>
        )}
      </Modal>

      {/* Export Dialog */}
      <Modal
        isOpen={exportDialogOpen}
        onClose={handleExportClose}
        title={`Export ${
          exportTarget?.type === "patient" ? "Patient" : "Study"
        } Data`}
        description="Download complete data package with DICOM files"
        maxWidth="sm"
      >
        <div className="space-y-6">
          <Alert severity="info" icon={<FileDown />}>
            <p className="font-bold text-sm">
              This export flow supports ZIP download and optional direct CD burn:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-4">
              <li>Complete metadata (JSON format)</li>
              <li>Patient and study information</li>
              {includeImages && <li>All DICOM files (.dcm)</li>}
              {includeImages && <li>Preview images (PNG format)</li>}
              <li>AI analysis results (if available)</li>
            </ul>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-800">Delivery Method</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportMode"
                checked={exportMode === "download"}
                onChange={() => setExportMode("download")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                Download ZIP file
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportMode"
                checked={exportMode === "burn-cd"}
                onChange={() => setExportMode("burn-cd")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                Export and attempt direct CD burn (Windows server host only)
              </span>
            </label>
          </div>

          {exportMode === "burn-cd" && (
            <div>
              <Input
                label="CD/DVD Drive Letter (Optional)"
                placeholder="Example: D"
                value={cdDriveLetter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCdDriveLetter(e.target.value.toUpperCase())
                }
                fullWidth
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for auto-detect. If direct burn fails, ZIP file is still prepared for manual burn.
              </p>
            </div>
          )}

          <div className="flex items-start">
            <input
              type="checkbox"
              id="includeImages"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="mt-1 h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="includeImages" className="ml-3 cursor-pointer">
              <span className="text-base font-medium text-gray-700">
                Include DICOM images and previews
              </span>
              <span className="block text-sm text-gray-500">
                Unchecking this will only export metadata (faster, smaller file)
              </span>
            </label>
          </div>

          {exportTarget && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-bold text-gray-800 mb-1">
                Export Target:
              </p>
              <p className="text-sm text-gray-600">
                Type:{" "}
                {exportTarget.type === "patient"
                  ? "Patient Data"
                  : "Study Data"}
              </p>
              <p className="text-sm text-gray-600 font-mono mt-1 break-all">
                ID: {exportTarget.id}
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleExportClose}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExportConfirm}
            disabled={exporting}
            loading={exporting}
            startIcon={<FileDown className="w-4 h-4" />}
          >
            {exporting
              ? "Processing..."
              : exportMode === "burn-cd"
              ? "Export + Burn CD"
              : "Export Data"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Global Error */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          icon={<AlertTriangle />}
          className="fixed bottom-6 right-6 min-w-[300px] z-50 shadow-xl"
        >
          <p className="font-bold text-sm">Error</p>
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          icon={<CheckCircle />}
          className="fixed bottom-6 right-6 min-w-[320px] z-50 shadow-xl"
        >
          <p className="font-bold text-sm">Success</p>
          <p className="text-sm">{success}</p>
        </Alert>
      )}
    </>
  );
};

export default PatientsPage;
