import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Video,
  Image as ImageIcon,
  Star,
  ExternalLink,
  ShieldCheck,
  Lock,
  LogOut,
  Search,
  Filter,
  Check,
  X,
  Hospital,
  ChevronRight,
} from 'lucide-react';
import {
  isAuthenticated,
  getAdminUser,
  login,
  logout,
  saveAdminCreds,
  getAdminCreds,
  type AdminUser,
} from '@/lib/auth-service';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  deleteStoredAppointment,
  type AppointmentRecord,
} from '@/lib/appointments-service';
import {
  getClinicTimingConfig,
  saveClinicTimingConfig,
  DEFAULT_CLINIC_CONFIG,
  formatTime24to12,
  type ClinicTimingConfig,
} from '@/lib/clinic-timing-service';
import {
  getPatientStories,
  addPatientStory,
  deletePatientStory,
  updatePatientStory,
  type PatientStory,
} from '@/lib/patient-stories-service';

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean>(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<'appointments' | 'timings' | 'stories' | 'account'>('appointments');

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAttachment, setSelectedAttachment] = useState<AppointmentRecord | null>(null);

  // Clinic Timing state
  const [timingConfig, setTimingConfig] = useState<ClinicTimingConfig>(DEFAULT_CLINIC_CONFIG);
  const [timingSavedSuccess, setTimingSavedSuccess] = useState(false);

  // Patient Stories state
  const [stories, setStories] = useState<PatientStory[]>([]);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [newStory, setNewStory] = useState<{
    patientName: string;
    context: string;
    treatment: string;
    message: string;
    rating: number;
    mediaType: 'image' | 'video' | 'both' | 'none';
    imageUrl: string;
    videoUrl: string;
    date: string;
    isPublished: boolean;
  }>({
    patientName: '',
    context: 'Patient · Layyah',
    treatment: 'Spine / Brain Consultation',
    message: '',
    rating: 5,
    mediaType: 'image',
    imageUrl: '',
    videoUrl: '',
    date: 'October 2026',
    isPublished: true,
  });

  // Account settings state
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [accountUpdateSuccess, setAccountUpdateSuccess] = useState(false);

  // Load state on mount
  useEffect(() => {
    const isAuth = isAuthenticated();
    setAuthed(isAuth);
    if (isAuth) {
      setUser(getAdminUser());
      loadAllData();
    }
  }, []);

  const loadAllData = () => {
    setAppointments(getStoredAppointments());
    setTimingConfig(getClinicTimingConfig());
    setStories(getPatientStories(false));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const result = login(loginIdentifier, loginPassword);
    if (result.success) {
      setAuthed(true);
      setUser(getAdminUser());
      loadAllData();
    } else {
      setLoginError(result.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setUser(null);
  };

  const handleStatusChange = (id: string | number, newStatus: AppointmentRecord['status']) => {
    updateAppointmentStatus(id, newStatus);
    setAppointments(getStoredAppointments());
  };

  const handleDeleteAppointment = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this appointment request?')) {
      deleteStoredAppointment(id);
      setAppointments(getStoredAppointments());
    }
  };

  const handleSaveTiming = (e: React.FormEvent) => {
    e.preventDefault();
    saveClinicTimingConfig(timingConfig);
    setTimingSavedSuccess(true);
    setTimeout(() => setTimingSavedSuccess(false), 3000);
  };

  const handleResetTiming = () => {
    if (window.confirm('Reset clinic timings to default (Mon-Sat: 3:30PM-9:00PM, Sun: 12:00PM-8:00PM, 12 appts/hr)?')) {
      setTimingConfig(DEFAULT_CLINIC_CONFIG);
      saveClinicTimingConfig(DEFAULT_CLINIC_CONFIG);
      setTimingSavedSuccess(true);
      setTimeout(() => setTimingSavedSuccess(false), 3000);
    }
  };

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStory.patientName || !newStory.message) {
      alert('Please fill out patient name and story message.');
      return;
    }
    addPatientStory(newStory);
    setStories(getPatientStories(false));
    setStoryModalOpen(false);
    setNewStory({
      patientName: '',
      context: 'Patient · Layyah',
      treatment: 'Spine / Brain Consultation',
      message: '',
      rating: 5,
      mediaType: 'image',
      imageUrl: '',
      videoUrl: '',
      date: 'October 2026',
      isPublished: true,
    });
  };

  const handleDeleteStory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this story?')) {
      deletePatientStory(id);
      setStories(getPatientStories(false));
    }
  };

  const handleToggleStoryPublished = (id: string, current: boolean) => {
    updatePatientStory(id, { isPublished: !current });
    setStories(getPatientStories(false));
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { username?: string; password?: string } = {};
    if (newUsername.trim()) updates.username = newUsername.trim();
    if (newPassword.trim()) updates.password = newPassword.trim();
    saveAdminCreds(updates);
    setUser(getAdminUser());
    setAccountUpdateSuccess(true);
    setNewPassword('');
    setTimeout(() => setAccountUpdateSuccess(false), 3000);
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((app) => {
    const matchesSearch =
      app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery) ||
      (app.message && app.message.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'requested').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = appointments.filter((a) => a.preferredDate === todayStr).length;

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-4 text-[#153247]">
        <div className="w-full max-w-md rounded-3xl border border-[#dce5e2] bg-[#fbf8f0] p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#153247] text-[#f2c55f]">
              <Lock className="size-7" />
            </div>
            <h1 className="display-face mt-4 text-2xl font-bold tracking-tight text-[#153247]">
              Doctor & Clinic Admin
            </h1>
            <p className="mt-1 text-sm text-[#587078]">
              Dr. Sajid Sohail Appointment Booking Management
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-xl bg-[#feebe8] p-3 text-xs font-semibold text-[#b3392f]">
                <AlertCircle className="size-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#31505b]">
                Username or Email
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="admin or admin@drsajidsohail.com"
                required
                className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-4 py-3 text-sm text-[#153247] outline-none transition focus:border-[#197263] focus:ring-2 focus:ring-[#197263]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#31505b]">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-4 py-3 text-sm text-[#153247] outline-none transition focus:border-[#197263] focus:ring-2 focus:ring-[#197263]/20"
              />
            </div>

            <div className="rounded-xl border border-[#e8dcb9] bg-[#fff8df] p-3 text-xs text-[#7c6328]">
              <p className="font-semibold">Default Credentials:</p>
              <p>Username: <code className="font-bold">admin</code> | Password: <code className="font-bold">admin</code></p>
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#153247] py-3.5 text-sm font-bold text-[#fbf8f0] shadow-md transition hover:bg-[#1f4866]"
            >
              Sign In to Portal <ChevronRight className="size-4" />
            </button>

            <div className="pt-2 text-center">
              <a
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#587078] hover:text-[#153247]"
              >
                ← Return to Patient Website
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f3f6f5] text-[#153247]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#d8e2df] bg-[#fbf8f0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#153247] text-[#f2c55f]">
              <Hospital className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-[#153247]">Dr. Sajid Sohail Clinic</h1>
                <span className="rounded-full bg-[#dcf1ea] px-2 py-0.5 text-[10px] font-bold text-[#197263]">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-[#6a8087]">Rahmania Medical Center, Layyah</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d4d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#31505b] shadow-sm transition hover:bg-[#f0f5f3]"
            >
              <ExternalLink className="size-3.5" /> View Website
            </a>
            <div className="hidden h-5 w-px bg-[#d8e2df] sm:block" />
            <div className="flex items-center gap-2">
              <div className="hidden text-right text-xs sm:block">
                <p className="font-bold text-[#153247]">{user?.name}</p>
                <p className="text-[#6a8087]">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-lg bg-[#fae8e6] px-3 py-1.5 text-xs font-bold text-[#b53a2f] transition hover:bg-[#f5d7d4]"
                title="Log out"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 border-t border-[#e2ece9] pt-1">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition sm:text-sm ${
                activeTab === 'appointments'
                  ? 'border-[#197263] text-[#197263]'
                  : 'border-transparent text-[#587078] hover:text-[#153247]'
              }`}
            >
              <Calendar className="size-4" />
              Appointments & Attachments
              {pendingCount > 0 && (
                <span className="rounded-full bg-[#197263] px-2 py-0.5 text-[10px] text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('timings')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition sm:text-sm ${
                activeTab === 'timings'
                  ? 'border-[#197263] text-[#197263]'
                  : 'border-transparent text-[#587078] hover:text-[#153247]'
              }`}
            >
              <Clock className="size-4" />
              Clinic Timing & Capacity
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition sm:text-sm ${
                activeTab === 'stories'
                  ? 'border-[#197263] text-[#197263]'
                  : 'border-transparent text-[#587078] hover:text-[#153247]'
              }`}
            >
              <Video className="size-4" />
              Patient Stories (Videos/Photos)
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition sm:text-sm ${
                activeTab === 'account'
                  ? 'border-[#197263] text-[#197263]'
                  : 'border-transparent text-[#587078] hover:text-[#153247]'
              }`}
            >
              <ShieldCheck className="size-4" />
              Admin Credentials
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6a8087]">Total Bookings</p>
            <p className="mt-1 text-2xl font-bold text-[#153247]">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6a8087]">Today's Visits</p>
            <p className="mt-1 text-2xl font-bold text-[#197263]">{todayCount}</p>
          </div>
          <div className="rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6a8087]">Needs Review</p>
            <p className="mt-1 text-2xl font-bold text-[#b57319]">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6a8087]">Confirmed</p>
            <p className="mt-1 text-2xl font-bold text-[#153247]">{confirmedCount}</p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: APPOINTMENTS & ATTACHMENTS */}
        {/* ======================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#cbd9d6] bg-white px-3 py-2">
                <Search className="size-4 text-[#718890]" />
                <input
                  type="text"
                  placeholder="Search by patient name, phone, or symptoms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#153247] outline-none sm:text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#889d9f] hover:text-[#153247]">
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Filter className="size-4 text-[#718890]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs font-semibold text-[#153247] outline-none"
                >
                  <option value="all">All Statuses ({appointments.length})</option>
                  <option value="requested">Requested ({pendingCount})</option>
                  <option value="confirmed">Confirmed ({confirmedCount})</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="overflow-hidden rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-[#dce5e2] bg-[#f2ede0] text-[11px] font-bold uppercase tracking-wider text-[#63553c]">
                    <tr>
                      <th className="px-4 py-3 sm:px-6">Patient</th>
                      <th className="px-4 py-3 sm:px-6">Date & Time</th>
                      <th className="px-4 py-3 sm:px-6">Status</th>
                      <th className="px-4 py-3 sm:px-6">Attachment</th>
                      <th className="px-4 py-3 sm:px-6">Details / Notes</th>
                      <th className="px-4 py-3 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7edea]">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[#6e8589]">
                          No appointment requests found matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app) => (
                        <tr key={app.id} className="transition hover:bg-[#f6f3eb]">
                          {/* Patient */}
                          <td className="px-4 py-3.5 sm:px-6">
                            <p className="font-bold text-[#153247]">{app.patientName}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#587078]">
                              <a
                                href={`tel:${app.phone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-1 font-medium text-[#197263] hover:underline"
                              >
                                <Phone className="size-3" /> {app.phone}
                              </a>
                              {app.email && (
                                <span className="hidden sm:inline text-[#82999e]">· {app.email}</span>
                              )}
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="px-4 py-3.5 sm:px-6">
                            <p className="font-semibold text-[#153247]">{app.preferredDate}</p>
                            <p className="inline-flex items-center gap-1 text-xs font-bold text-[#b57319]">
                              <Clock className="size-3" /> {app.preferredTime}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 sm:px-6">
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleStatusChange(app.id, e.target.value as AppointmentRecord['status'])
                              }
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold outline-none ${
                                app.status === 'confirmed'
                                  ? 'border-[#a8d6c7] bg-[#e4f6ef] text-[#197263]'
                                  : app.status === 'requested'
                                  ? 'border-[#f2d89b] bg-[#fff3d4] text-[#a0680d]'
                                  : app.status === 'completed'
                                  ? 'border-[#c7d9d5] bg-[#edf2f0] text-[#47676e]'
                                  : 'border-[#f2bebe] bg-[#fdeeee] text-[#ba3434]'
                              }`}
                            >
                              <option value="requested">Requested</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Attachment */}
                          <td className="px-4 py-3.5 sm:px-6">
                            {app.attachmentName ? (
                              <button
                                onClick={() => setSelectedAttachment(app)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#bad1cb] bg-[#eef6f3] px-2.5 py-1.5 text-xs font-bold text-[#197263] transition hover:bg-[#d8ece4]"
                              >
                                <Eye className="size-3.5" />
                                <span className="max-w-[120px] truncate">{app.attachmentName}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-[#9aa8ab]">None</span>
                            )}
                          </td>

                          {/* Details / Notes */}
                          <td className="px-4 py-3.5 sm:px-6">
                            <p className="max-w-xs text-xs text-[#526a72] line-clamp-2">
                              {app.message || 'No additional note provided.'}
                            </p>
                            <span className="text-[10px] text-[#93a6a9]">
                              Booked on {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}?text=Assalam%20o%20Alaikum%20${encodeURIComponent(app.patientName)},%20regarding%20your%20appointment%20with%20Dr.%20Sajid%20Sohail%20on%20${app.preferredDate}%20at%20${app.preferredTime}.`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-[#25D366]/15 p-1.5 text-[#128C7E] transition hover:bg-[#25D366]/25"
                                title="Message on WhatsApp"
                              >
                                <Phone className="size-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteAppointment(app.id)}
                                className="rounded-lg p-1.5 text-[#a8443b] transition hover:bg-[#fee7e5]"
                                title="Delete record"
                              >
                                <Trash2 className="size-3.5" />
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
        )}

        {/* ======================================================== */}
        {/* TAB 2: CLINIC TIMING & CAPACITY CONFIGURATION */}
        {/* ======================================================== */}
        {activeTab === 'timings' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-[#e5ece9] pb-4">
                <div>
                  <h2 className="display-face text-xl font-bold text-[#153247]">
                    Dynamic Clinic Timings & Capacity
                  </h2>
                  <p className="mt-1 text-xs text-[#587078]">
                    Changes saved here immediately update the website booking slots and patient notices without needing code changes!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetTiming}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#c5d5d1] bg-white px-3 py-1.5 text-xs font-bold text-[#4e6c73] transition hover:bg-[#f3f7f5]"
                >
                  <RotateCcw className="size-3.5" /> Reset Defaults
                </button>
              </div>

              {timingSavedSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#e3f4ee] p-3 text-xs font-bold text-[#197263]">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Clinic timings successfully updated and live on website!</span>
                </div>
              )}

              <form onSubmit={handleSaveTiming} className="mt-6 space-y-6">
                {/* Monday - Saturday Schedule */}
                <div className="rounded-2xl border border-[#d8e4e0] bg-[#f4f7f6] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#153247]">Monday – Saturday Schedule</h3>
                      <p className="text-xs text-[#637d83]">Regular outpatient clinic hours</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-[#153247]">
                      <input
                        type="checkbox"
                        checked={timingConfig.monToSat.active}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            monToSat: { ...timingConfig.monToSat, active: e.target.checked },
                          })
                        }
                        className="size-4 rounded text-[#197263]"
                      />
                      Active
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">Start Time</label>
                      <input
                        type="time"
                        value={timingConfig.monToSat.startTime}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            monToSat: { ...timingConfig.monToSat, startTime: e.target.value },
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Format: {formatTime24to12(timingConfig.monToSat.startTime)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">End Time</label>
                      <input
                        type="time"
                        value={timingConfig.monToSat.endTime}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            monToSat: { ...timingConfig.monToSat, endTime: e.target.value },
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Format: {formatTime24to12(timingConfig.monToSat.endTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sunday Schedule */}
                <div className="rounded-2xl border border-[#d8e4e0] bg-[#f4f7f6] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#153247]">Sunday Schedule</h3>
                      <p className="text-xs text-[#637d83]">Special weekend consultation hours</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-[#153247]">
                      <input
                        type="checkbox"
                        checked={timingConfig.sunday.active}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            sunday: { ...timingConfig.sunday, active: e.target.checked },
                          })
                        }
                        className="size-4 rounded text-[#197263]"
                      />
                      Active
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">Start Time</label>
                      <input
                        type="time"
                        value={timingConfig.sunday.startTime}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            sunday: { ...timingConfig.sunday, startTime: e.target.value },
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Format: {formatTime24to12(timingConfig.sunday.startTime)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">End Time</label>
                      <input
                        type="time"
                        value={timingConfig.sunday.endTime}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            sunday: { ...timingConfig.sunday, endTime: e.target.value },
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Format: {formatTime24to12(timingConfig.sunday.endTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hourly Capacity & Slot Interval */}
                <div className="rounded-2xl border border-[#d8e4e0] bg-[#f4f7f6] p-5">
                  <h3 className="font-bold text-[#153247]">Appointment Capacity & Intervals</h3>
                  <p className="text-xs text-[#637d83]">
                    Configure slot duration and max appointments allowed per 1-hour block
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">
                        Appointments Per Hour
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={timingConfig.appointmentsPerHour}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            appointmentsPerHour: parseInt(e.target.value || '12', 10),
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Currently set to: <strong>{timingConfig.appointmentsPerHour} appointments/hour</strong>
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#426168]">
                        Slot Duration (Minutes)
                      </label>
                      <select
                        value={timingConfig.slotIntervalMinutes}
                        onChange={(e) =>
                          setTimingConfig({
                            ...timingConfig,
                            slotIntervalMinutes: parseInt(e.target.value, 10),
                          })
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      >
                        <option value={5}>5 Minutes (12 slots per hour)</option>
                        <option value={10}>10 Minutes (6 slots per hour)</option>
                        <option value={15}>15 Minutes (4 slots per hour)</option>
                        <option value={30}>30 Minutes (2 slots per hour)</option>
                        <option value={60}>60 Minutes (Hourly block)</option>
                      </select>
                      <span className="mt-1 block text-[11px] text-[#718a90]">
                        Determines the time gap between generated slots
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Custom Notice */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#426168]">Clinic Phone</label>
                    <input
                      type="text"
                      value={timingConfig.phone}
                      onChange={(e) => setTimingConfig({ ...timingConfig, phone: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm text-[#153247] outline-none focus:border-[#197263]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#426168]">Emergency Phone</label>
                    <input
                      type="text"
                      value={timingConfig.emergencyPhone}
                      onChange={(e) => setTimingConfig({ ...timingConfig, emergencyPhone: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm text-[#153247] outline-none focus:border-[#197263]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#426168]">
                    Special Clinic Notice (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Ramadan timings or Eid holiday schedule..."
                    value={timingConfig.customNotice || ''}
                    onChange={(e) => setTimingConfig({ ...timingConfig, customNotice: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-sm text-[#153247] outline-none focus:border-[#197263]"
                  />
                </div>

                <div className="border-t border-[#e5ece9] pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#197263] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#155e51]"
                  >
                    <Save className="size-4" /> Save Clinic Timing & Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PATIENT STORIES (VIDEO, PICTURE, MESSAGE) */}
        {/* ======================================================== */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-6 shadow-sm sm:flex-row sm:items-center">
              <div>
                <h2 className="display-face text-xl font-bold text-[#153247]">
                  Patient Stories & Experiences
                </h2>
                <p className="mt-1 text-xs text-[#587078]">
                  Upload and manage recovery stories with videos, pictures, and messages displayed on the website.
                </p>
              </div>

              <button
                onClick={() => setStoryModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#153247] px-4 py-2.5 text-xs font-bold text-[#fbf8f0] shadow-sm transition hover:bg-[#1f4866]"
              >
                <Plus className="size-4" /> Add New Patient Story
              </button>
            </div>

            {/* Stories Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-5 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    {/* Media Badge & Status */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f4f3] px-2.5 py-0.5 text-[11px] font-bold text-[#47656d]">
                        {story.mediaType === 'video' && <Video className="size-3 text-[#b53a2f]" />}
                        {story.mediaType === 'image' && <ImageIcon className="size-3 text-[#197263]" />}
                        {story.mediaType === 'both' && <Video className="size-3 text-[#197263]" />}
                        {story.mediaType.toUpperCase()} STORY
                      </span>

                      <button
                        onClick={() => handleToggleStoryPublished(story.id, story.isPublished)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                          story.isPublished
                            ? 'bg-[#dcf1ea] text-[#197263]'
                            : 'bg-[#f4e2e0] text-[#a8443b]'
                        }`}
                      >
                        {story.isPublished ? '● Published' : '○ Draft'}
                      </button>
                    </div>

                    {/* Media Preview if available */}
                    {story.imageUrl && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#dce5e2] bg-[#eef2f1]">
                        <img
                          src={story.imageUrl}
                          alt={story.patientName}
                          className="h-32 w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {story.videoUrl && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-[#b53a2f]">
                        <Video className="size-3.5" />
                        <a
                          href={story.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:underline"
                        >
                          {story.videoUrl}
                        </a>
                      </div>
                    )}

                    {/* Stars */}
                    <div className="mt-3 flex items-center gap-1 text-[#d09b29]">
                      {Array.from({ length: story.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </div>

                    {/* Message Quote */}
                    <p className="mt-2 text-sm italic leading-relaxed text-[#3a5862]">
                      "{story.message}"
                    </p>
                  </div>

                  {/* Patient Info Footer */}
                  <div className="mt-4 border-t border-[#e7edea] pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#153247]">{story.patientName}</p>
                        <p className="text-[10px] text-[#789094]">{story.treatment}</p>
                        <p className="text-[10px] text-[#91a3a7]">{story.context}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="rounded-lg p-1.5 text-[#a8443b] transition hover:bg-[#fee7e5]"
                        title="Delete story"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Add New Story */}
            {storyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#153247]/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-3xl border border-[#dce5e2] bg-[#fbf8f0] p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#e5ece9] pb-3">
                    <h3 className="display-face text-lg font-bold text-[#153247]">
                      Add Patient Story
                    </h3>
                    <button
                      onClick={() => setStoryModalOpen(false)}
                      className="rounded-full p-1 text-[#6a8087] hover:bg-[#e9efec]"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateStory} className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#31505b]">Patient Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Muhammad Usman"
                          value={newStory.patientName}
                          onChange={(e) => setNewStory({ ...newStory, patientName: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs font-semibold text-[#153247] outline-none focus:border-[#197263]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#31505b]">City / Context</label>
                        <input
                          type="text"
                          placeholder="e.g. Layyah · Spine Patient"
                          value={newStory.context}
                          onChange={(e) => setNewStory({ ...newStory, context: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs font-semibold text-[#153247] outline-none focus:border-[#197263]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#31505b]">Treatment / Procedure</label>
                      <input
                        type="text"
                        placeholder="e.g. Endoscopic Spine Surgery / Brain Consultation"
                        value={newStory.treatment}
                        onChange={(e) => setNewStory({ ...newStory, treatment: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs font-semibold text-[#153247] outline-none focus:border-[#197263]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#31505b]">Media Format</label>
                      <select
                        value={newStory.mediaType}
                        onChange={(e) =>
                          setNewStory({
                            ...newStory,
                            mediaType: e.target.value as PatientStory['mediaType'],
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs font-semibold text-[#153247] outline-none"
                      >
                        <option value="image">Picture (Image)</option>
                        <option value="video">Video URL (YouTube/Vimeo/MP4)</option>
                        <option value="both">Both Picture and Video</option>
                        <option value="none">Text Only (No media)</option>
                      </select>
                    </div>

                    {(newStory.mediaType === 'image' || newStory.mediaType === 'both') && (
                      <div>
                        <label className="block text-xs font-bold text-[#31505b]">
                          Picture (Image URL or Upload)
                        </label>
                        <input
                          type="text"
                          placeholder="Image URL (e.g. /images/avatar-muhammad.jpg or online URL)"
                          value={newStory.imageUrl}
                          onChange={(e) => setNewStory({ ...newStory, imageUrl: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs text-[#153247] outline-none focus:border-[#197263]"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setNewStory((prev) => ({
                                  ...prev,
                                  imageUrl: event.target?.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="mt-1 block text-[11px] text-[#6a8087]"
                        />
                      </div>
                    )}

                    {(newStory.mediaType === 'video' || newStory.mediaType === 'both') && (
                      <div>
                        <label className="block text-xs font-bold text-[#31505b]">Video URL</label>
                        <input
                          type="text"
                          placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                          value={newStory.videoUrl}
                          onChange={(e) => setNewStory({ ...newStory, videoUrl: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs text-[#153247] outline-none focus:border-[#197263]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#31505b]">Patient Message / Review *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Write what the patient shared about their treatment, recovery, and experience..."
                        value={newStory.message}
                        onChange={(e) => setNewStory({ ...newStory, message: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2 text-xs text-[#153247] outline-none focus:border-[#197263]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[#e5ece9] pt-4">
                      <button
                        type="button"
                        onClick={() => setStoryModalOpen(false)}
                        className="rounded-xl border border-[#c4d4d0] px-4 py-2 text-xs font-bold text-[#587078] hover:bg-[#e9efec]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-[#153247] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1f4866]"
                      >
                        Publish Story
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ACCOUNT SETTINGS */}
        {/* ======================================================== */}
        {activeTab === 'account' && (
          <div className="max-w-md rounded-2xl border border-[#dce5e2] bg-[#fbf8f0] p-6 shadow-sm">
            <h2 className="display-face text-xl font-bold text-[#153247]">Admin Account Settings</h2>
            <p className="mt-1 text-xs text-[#587078]">Change your admin login username or password.</p>

            {accountUpdateSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#e3f4ee] p-3 text-xs font-bold text-[#197263]">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Credentials updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdateAccount} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#426168]">Current Username</label>
                <input
                  type="text"
                  value={user?.username}
                  disabled
                  className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-[#f0f4f3] px-3 py-2.5 text-xs text-[#789094]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#426168]">New Username (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to keep current"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-xs text-[#153247] outline-none focus:border-[#197263]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#426168]">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd9d6] bg-white px-3 py-2.5 text-xs text-[#153247] outline-none focus:border-[#197263]"
                />
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#153247] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1f4866]"
              >
                <Save className="size-4" /> Save New Credentials
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* ATTACHMENT VIEWER MODAL */}
        {/* ======================================================== */}
        {selectedAttachment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#153247]/65 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-[#dce5e2] bg-[#fbf8f0] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e5ece9] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-[#197263]" />
                  <div>
                    <h3 className="font-bold text-[#153247]">{selectedAttachment.attachmentName}</h3>
                    <p className="text-xs text-[#6a8087]">
                      Patient: {selectedAttachment.patientName} ({selectedAttachment.phone})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="rounded-full p-1.5 text-[#6a8087] hover:bg-[#e9efec]"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-4">
                {selectedAttachment.attachmentData ? (
                  selectedAttachment.attachmentType?.startsWith('image/') ||
                  selectedAttachment.attachmentData.startsWith('data:image/') ||
                  /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedAttachment.attachmentName || '') ? (
                    <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-[#dce5e2] bg-[#f2f6f4] p-2">
                      <img
                        src={selectedAttachment.attachmentData}
                        alt="Patient Attachment"
                        className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#dce5e2] bg-[#f4f7f6] p-8 text-center">
                      <FileText className="mx-auto size-12 text-[#197263]" />
                      <p className="mt-3 font-bold text-[#153247]">{selectedAttachment.attachmentName}</p>
                      <p className="mt-1 text-xs text-[#6a8087]">Document file uploaded by patient</p>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-[#dce5e2] bg-[#f4f7f6] p-8 text-center">
                    <FileText className="mx-auto size-12 text-[#197263]" />
                    <p className="mt-3 font-bold text-[#153247]">{selectedAttachment.attachmentName}</p>
                    <p className="mt-1 text-xs text-[#6a8087]">File reference registered with appointment.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#e5ece9] pt-4">
                <span className="text-xs text-[#6a8087]">
                  {selectedAttachment.attachmentSize || 'Size: N/A'}
                </span>
                <div className="flex gap-2">
                  {selectedAttachment.attachmentData && (
                    <a
                      href={selectedAttachment.attachmentData}
                      download={selectedAttachment.attachmentName || 'patient-attachment'}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#197263] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#155e51]"
                    >
                      <Download className="size-3.5" /> Download Attachment
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedAttachment(null)}
                    className="rounded-xl border border-[#c4d4d0] px-4 py-2 text-xs font-bold text-[#587078] hover:bg-[#e9efec]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
