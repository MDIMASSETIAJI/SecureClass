"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Plus,
  Clock,
  Upload,
  Download,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("MAHASISWA");
  const [loading, setLoading] = useState(true);

  // New task modal state (for Dosen / Admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [creating, setCreating] = useState(false);

  // New course modal state (for Admin only)
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseLecturerId, setNewCourseLecturerId] = useState("");
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Submission modal state (for Mahasiswa)
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Submissions inspector modal (for Dosen / Admin)
  const [inspectTaskId, setInspectTaskId] = useState<string | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/academic/tasks").then((r) => r.json()),
      fetch("/api/academic/courses").then((r) => r.json()),
    ])
      .then(([authData, tasksData, coursesData]) => {
        if (authData.authenticated) {
          setUserRole(authData.user.role);
        }
        if (tasksData.success) {
          setTasks(tasksData.tasks || []);
        }
        if (coursesData.success) {
          setCourses(coursesData.courses || []);
          setLecturers(coursesData.lecturers || []);
          if (coursesData.courses.length > 0) {
            setSelectedCourseId(coursesData.courses[0].id);
          }
          if (coursesData.lecturers && coursesData.lecturers.length > 0) {
            setNewCourseLecturerId((prev) => prev || coursesData.lecturers[0].id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseName || !newCourseLecturerId) {
      setCourseError("Kode mata kuliah, nama, dan dosen pengampu wajib diisi.");
      return;
    }
    setCreatingCourse(true);
    setCourseError(null);
    try {
      const res = await fetch("/api/academic/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCourseCode.trim(),
          name: newCourseName.trim(),
          description: newCourseDesc.trim(),
          lecturerId: newCourseLecturerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat mata kuliah.");

      setShowCreateCourseModal(false);
      setNewCourseCode("");
      setNewCourseName("");
      setNewCourseDesc("");
      loadData();
      alert(`Mata kuliah ${data.course.code} berhasil ditambahkan!`);
    } catch (err: any) {
      setCourseError(err.message);
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/academic/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: newTitle,
          description: newDescription,
          deadline: newDeadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat tugas.");

      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTaskId || !selectedFile) return;

    setSubmitting(true);
    setSubmitSuccess(null);

    try {
      // 1. Upload & encrypt file via ChaCha20-Poly1305
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", `Tugas: ${selectedFile.name}`);

      const uploadRes = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Gagal mengenkripsi dan mengunggah berkas.");

      // 2. Submit task with encrypted file ID
      const submitRes = await fetch(`/api/academic/tasks/${submittingTaskId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedFileId: uploadData.fileId,
          notes: submissionNotes,
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Gagal mencatat pengumpulan tugas.");

      setSubmitSuccess("Tugas berhasil dikumpulkan dalam format terenkripsi ChaCha20-Poly1305!");
      setTimeout(() => {
        setSubmittingTaskId(null);
        setSelectedFile(null);
        setSubmissionNotes("");
        setSubmitSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const viewSubmissions = async (taskId: string) => {
    setInspectTaskId(taskId);
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/academic/tasks/${taskId}/submissions`);
      const data = await res.json();
      if (res.ok) {
        setTaskSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  return (
    <>
      <AppLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Tugas & Dokumen Akademik
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Seluruh berkas tugas dan dokumen dilindungi enkripsi ChaCha20-Poly1305 dan dicatat pada Blockchain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {userRole === "ADMIN" && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowCreateCourseModal(true)}
              >
                <BookOpen className="w-4 h-4 mr-2 text-[#58CC02]" />
                + Tambah Mata Kuliah
              </Button>
            )}

            {(userRole === "DOSEN" || userRole === "ADMIN") && (
              <Button
                variant="primary"
                size="md"
                disabled={courses.length === 0}
                onClick={() => {
                  if (courses.length === 0) {
                    alert("Belum ada mata kuliah. Silakan buat mata kuliah terlebih dahulu.");
                    return;
                  }
                  setShowCreateModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Terbitkan Tugas Baru
              </Button>
            )}
          </div>
        </div>

        {/* Course Banner when Empty for Admin */}
        {courses.length === 0 && userRole === "ADMIN" && (
          <Card className="p-5 border-2 border-dashed border-[#58CC02] bg-[#F4FBEF] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center text-[#58CC02] shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#3C3C3C]">Belum Ada Mata Kuliah Terdaftar</h3>
                <p className="text-xs text-[#777777] font-semibold">
                  Sebagai Administrator, Anda dapat menambahkan Mata Kuliah baru agar Dosen dapat mengunggah tugas & dokumen kuliah.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowCreateCourseModal(true)}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Mata Kuliah Sekarang
            </Button>
          </Card>
        )}

        {/* Task List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-black text-[#3C3C3C] text-base">Belum Ada Tugas Aktif</h3>
              <p className="text-xs text-[#777777] mt-1">Tugas akademik yang diterbitkan akan tampil di sini.</p>
            </Card>
          ) : (
            tasks.map((task) => {
              const hasSubmitted = task.submissions && task.submissions.length > 0;
              return (
                <Card key={task.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="blue">{task.course?.code || "KULIAH"}</Badge>
                        <span className="text-xs font-bold text-[#777777]">
                          {task.course?.name}
                        </span>
                        {hasSubmitted && userRole === "MAHASISWA" && (
                          <Badge variant="green">SUDAH DIKUMPULKAN</Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-[#3C3C3C]">{task.title}</h3>
                      <p className="text-xs text-[#777777] font-medium leading-relaxed">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs font-bold text-[#777777] pt-1">
                        <Clock className="w-4 h-4 text-[#58CC02]" />
                        <span>Deadline: {new Date(task.deadline).toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2">
                      {userRole === "MAHASISWA" ? (
                        <Button
                          variant={hasSubmitted ? "secondary" : "primary"}
                          size="md"
                          onClick={() => setSubmittingTaskId(task.id)}
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          {hasSubmitted ? "Unggah Ulang Tugas" : "Kumpulkan Tugas"}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => viewSubmissions(task.id)}
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          Lihat Pengumpulan ({task.submissions?.length || 0})
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>

    {/* MODAL: Create New Course (Only Admin) */}
      {showCreateCourseModal && userRole === "ADMIN" && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-[#58CC02] flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#3C3C3C]">
                      Tambah Mata Kuliah Baru
                    </h2>
                    <p className="text-[11px] font-bold text-[#777777]">
                      Khusus Administrator Institusi
                    </p>
                  </div>
                </div>
                <Badge variant="red">ADMIN ONLY</Badge>
              </div>

              {courseError && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{courseError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCourse} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Kode Mata Kuliah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IF301 / KRP01"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Nama Mata Kuliah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kriptografi dan Keamanan Siber"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Dosen Pengampu <span className="text-red-500">*</span>
                  </label>
                  {lecturers.length === 0 ? (
                    <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-700 text-xs font-semibold">
                      Belum ada akun Dosen/Admin lain di database. Anda dapat menugaskan diri sendiri atau mendaftarkan akun Dosen terlebih dahulu.
                    </div>
                  ) : (
                    <select
                      value={newCourseLecturerId}
                      onChange={(e) => setNewCourseLecturerId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    >
                      {lecturers.map((lec) => (
                        <option key={lec.id} value={lec.id}>
                          {lec.fullName} ({lec.username}) — [{lec.role}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Deskripsi Mata Kuliah (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Deskripsi materi perkuliahan, topik, atau kompetensi..."
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setShowCreateCourseModal(false);
                      setCourseError(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={creatingCourse || !newCourseCode || !newCourseName || !newCourseLecturerId}
                  >
                    {creatingCourse ? "Menyimpan..." : "Simpan Mata Kuliah"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* MODAL: Create New Task (Dosen / Admin) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <h2 className="text-lg font-black text-[#3C3C3C] mb-4">
                Terbitkan Tugas Akademik Baru
              </h2>

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">Mata Kuliah</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">Judul Tugas</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="misal: Tugas 2: Analisis Liveness Deteksi Wajah"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">Instruksi & Deskripsi</label>
                  <textarea
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Tuliskan petunjuk teknis pengumpulan tugas..."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">Batas Waktu (Deadline)</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={creating}>
                    Terbitkan Tugas
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* MODAL: Submit Task (Mahasiswa) */}
        {submittingTaskId && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <h2 className="text-lg font-black text-[#3C3C3C] mb-1">
                Kumpulkan Tugas Akademik
              </h2>
              <p className="text-xs text-[#777777] font-medium mb-4">
                Berkas akan dienkripsi secara otomatis menggunakan algoritma{" "}
                <strong className="text-[#58CC02]">ChaCha20-Poly1305</strong> sebelum disimpan.
              </p>

              {submitSuccess ? (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-[#58CC02] mx-auto" />
                  <p className="text-sm font-extrabold text-[#46A302]">{submitSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleFileSubmit} className="space-y-4 text-xs font-bold">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-[#F7F7F7]">
                    <FileCheck2 className="w-8 h-8 text-[#58CC02] mx-auto mb-2" />
                    <input
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="text-xs font-semibold text-[#3C3C3C]"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-xs font-bold text-[#46A302]">
                        Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB (Akan dienkripsi ChaCha20)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Catatan Tambahan (Opsional)</label>
                    <textarea
                      rows={2}
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      placeholder="Catatan pengerjaan..."
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSubmittingTaskId(null)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={submitting}
                      disabled={!selectedFile}
                    >
                      Enkripsi & Kumpulkan Tugas
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* MODAL: View Submissions (Dosen / Admin) */}
        {inspectTaskId && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-lg font-black text-[#3C3C3C]">
                  Daftar Pengumpulan Mahasiswa
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectTaskId(null)}
                >
                  Tutup
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {loadingSubmissions ? (
                  <p className="text-center py-6 text-xs text-[#777777]">Memuat pengumpulan...</p>
                ) : taskSubmissions.length === 0 ? (
                  <p className="text-center py-6 text-xs text-[#777777]">Belum ada mahasiswa yang mengumpulkan.</p>
                ) : (
                  taskSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl border border-gray-200 bg-[#F7F7F7] flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs font-black text-[#3C3C3C]">{sub.student.fullName}</p>
                        <p className="text-[11px] text-[#777777]">
                          NIM/Username: {sub.student.username} • Waktu: {new Date(sub.submittedAt).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] text-[#777777] font-mono mt-1">
                          Enkripsi: ChaCha20-Poly1305 • SHA256: {sub.encryptedFile?.checksumSha256?.slice(0, 16)}...
                        </p>
                      </div>

                      <a
                        href={`/api/files/download/${sub.encryptedFileId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="primary" size="sm">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Dekripsi & Unduh
                        </Button>
                      </a>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
    </>
  );
}

