import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Course, CourseEdition, CourseEnrollment, CourseLesson, useCourses } from "@/hooks/useCourses";
import { getCourseTypeInfo } from "@/pages/CourseManagement";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  ChevronLeft, Plus, Pencil, Trash2, Users, Calendar, MapPin,
  User, BookOpen, Clock, CheckCircle2, FileText, GraduationCap, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttendancePDFButton } from "./CoursePDFGenerator";
import CertificateTemplateDialog from "./CertificateTemplates";

interface Props {
  course: Course;
  onBack: () => void;
}

const EDITION_STATUSES = [
  { value: "pianificata", label: "Pianificata" },
  { value: "in_corso", label: "In Corso" },
  { value: "completata", label: "Completata" },
  { value: "annullata", label: "Annullata" },
];

const CourseDetail = ({ course, onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    fetchEditions, createEdition, updateEdition, deleteEdition,
    fetchEnrollments, createEnrollment, updateEnrollment, deleteEnrollment,
    fetchLessons, createLesson, deleteLesson, upsertAttendance, fetchAttendance,
    updateCourse, deleteCourse,
  } = useCourses();

  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<CourseEdition | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, boolean>>>({});
  const [activeTab, setActiveTab] = useState("edizioni");
  const [showAddEdition, setShowAddEdition] = useState(false);
  const [showAddEnrollment, setShowAddEnrollment] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [certificateEnrollment, setCertificateEnrollment] = useState<CourseEnrollment | null>(null);

  // Available employees for enrollment
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const loadEditions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('course_editions')
      .select('*')
      .eq('course_id', course.id)
      .order('start_date', { ascending: false });
    setEditions(data || []);
  }, [user, course.id]);

  const loadEditionDetails = useCallback(async (edition: CourseEdition) => {
    const [enr, les] = await Promise.all([
      fetchEnrollments(edition.id),
      fetchLessons(edition.id),
    ]);
    setEnrollments(enr);
    setLessons(les);

    // Load attendance for all lessons
    const attMap: Record<string, Record<string, boolean>> = {};
    for (const lesson of les) {
      const att = await fetchAttendance(lesson.id);
      attMap[lesson.id] = {};
      att.forEach((a: any) => { attMap[lesson.id][a.enrollment_id] = a.present; });
    }
    setAttendanceMap(attMap);
  }, [fetchEnrollments, fetchLessons, fetchAttendance]);

  useEffect(() => {
    loadEditions();
  }, [loadEditions]);

  useEffect(() => {
    if (selectedEdition) loadEditionDetails(selectedEdition);
  }, [selectedEdition, loadEditionDetails]);

  // Load employees for enrollment dialog
  const loadEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('crm_employees')
      .select('id, first_name, last_name, fiscal_code, contact_id, contact:crm_contacts(name)')
      .eq('status', 'active')
      .order('last_name');
    setAvailableEmployees(data || []);
  }, []);

  const typeInfo = getCourseTypeInfo(course.course_type);

  // Edition form state
  const [editionForm, setEditionForm] = useState({
    edition_code: "", start_date: "", end_date: "", location: "", classroom: "",
    instructor_name: "", instructor_email: "", status: "pianificata", notes: "",
  });

  const handleCreateEdition = async () => {
    const result = await createEdition({ ...editionForm, course_id: course.id });
    if (result) {
      setShowAddEdition(false);
      setEditionForm({ edition_code: "", start_date: "", end_date: "", location: "", classroom: "", instructor_name: "", instructor_email: "", status: "pianificata", notes: "" });
      loadEditions();
    }
  };

  // Lesson form
  const [lessonForm, setLessonForm] = useState({ lesson_date: "", start_time: "", end_time: "", topic: "", instructor_name: "" });

  const handleCreateLesson = async () => {
    if (!selectedEdition || !lessonForm.lesson_date) return;
    const result = await createLesson({ ...lessonForm, edition_id: selectedEdition.id });
    if (result) {
      setShowAddLesson(false);
      setLessonForm({ lesson_date: "", start_time: "", end_time: "", topic: "", instructor_name: "" });
      loadEditionDetails(selectedEdition);
    }
  };

  // Enrollment
  const handleEnrollEmployee = async (employeeId: string, contactId: string | null) => {
    if (!selectedEdition) return;
    const exists = enrollments.find(e => e.employee_id === employeeId);
    if (exists) {
      toast({ title: "Dipendente già iscritto", variant: "destructive" });
      return;
    }
    await createEnrollment({ edition_id: selectedEdition.id, employee_id: employeeId, contact_id: contactId });
    loadEditionDetails(selectedEdition);
  };

  // Attendance toggle
  const handleToggleAttendance = async (lessonId: string, enrollmentId: string, current: boolean) => {
    const success = await upsertAttendance(lessonId, enrollmentId, !current);
    if (success) {
      setAttendanceMap(prev => ({
        ...prev,
        [lessonId]: { ...prev[lessonId], [enrollmentId]: !current }
      }));
    }
  };

  // Certificate
  const handleIssueCertificate = async (enrollmentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const expiryDate = course.renewal_months
      ? new Date(Date.now() + course.renewal_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;
    await updateEnrollment(enrollmentId, {
      certificate_issued: true,
      certificate_date: today,
      certificate_expiry: expiryDate,
      status: 'completato',
    } as any);
    toast({ title: "Attestato emesso" });
    if (selectedEdition) loadEditionDetails(selectedEdition);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT');
  const filteredEmployees = availableEmployees.filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.fiscal_code || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.contact?.name || '').toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Detail view for selected edition
  if (selectedEdition) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-7xl">
          <Button variant="ghost" onClick={() => setSelectedEdition(null)} className="mb-4 gap-2">
            <ChevronLeft className="h-4 w-4" /> Torna a {course.name}
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{selectedEdition.edition_code || 'Edizione'}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedEdition.start_date && formatDate(selectedEdition.start_date)}
                {selectedEdition.end_date && selectedEdition.end_date !== selectedEdition.start_date && ` - ${formatDate(selectedEdition.end_date)}`}
                {selectedEdition.location && ` • ${selectedEdition.location}`}
                {selectedEdition.instructor_name && ` • Docente: ${selectedEdition.instructor_name}`}
              </p>
            </div>
            <Select
              value={selectedEdition.status}
              onValueChange={async v => {
                await updateEdition(selectedEdition.id, { status: v });
                setSelectedEdition({ ...selectedEdition, status: v });
                loadEditions();
              }}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDITION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="iscritti" className="space-y-4">
            <TabsList>
              <TabsTrigger value="iscritti" className="gap-1"><Users className="h-4 w-4" /> Iscritti ({enrollments.length})</TabsTrigger>
              <TabsTrigger value="lezioni" className="gap-1"><BookOpen className="h-4 w-4" /> Lezioni ({lessons.length})</TabsTrigger>
              <TabsTrigger value="presenze" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Registro Presenze</TabsTrigger>
            </TabsList>

            {/* ISCRITTI TAB */}
            <TabsContent value="iscritti">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Partecipanti</h3>
                <Button size="sm" onClick={() => { loadEmployees(); setShowAddEnrollment(true); }} className="gap-1">
                  <Plus className="h-4 w-4" /> Iscrivi Dipendente
                </Button>
              </div>
              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nessun iscritto</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Attestato</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map(enr => (
                        <TableRow key={enr.id}>
                          <TableCell className="font-medium">
                            {enr.employee ? `${enr.employee.first_name} ${enr.employee.last_name}` : 'N/D'}
                          </TableCell>
                          <TableCell>{enr.contact?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{enr.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {enr.certificate_issued ? (
                              <div className="text-xs">
                                <Badge className="bg-green-100 text-green-800">Emesso</Badge>
                                {enr.certificate_expiry && (
                                  <p className="mt-1 text-muted-foreground">Scade: {formatDate(enr.certificate_expiry)}</p>
                                )}
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleIssueCertificate(enr.id)}>
                                <FileText className="h-3 w-3 mr-1" /> Emetti
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {enr.certificate_issued && (
                                <CertificatePDFButton
                                  courseName={course.name}
                                  editionCode={selectedEdition.edition_code || ''}
                                  startDate={selectedEdition.start_date || undefined}
                                  endDate={selectedEdition.end_date || undefined}
                                  location={selectedEdition.location || undefined}
                                  instructorName={selectedEdition.instructor_name || undefined}
                                  enrollments={enrollments}
                                  lessons={lessons}
                                  attendanceMap={attendanceMap}
                                  durationHours={course.duration_hours}
                                  renewalMonths={course.renewal_months}
                                  enrollment={enr}
                                />
                              )}
                              <Button size="icon" variant="ghost" onClick={async () => {
                                if (confirm('Rimuovere iscrizione?')) {
                                  await deleteEnrollment(enr.id);
                                  loadEditionDetails(selectedEdition);
                                }
                              }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* LEZIONI TAB */}
            <TabsContent value="lezioni">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Calendario Lezioni</h3>
                <Button size="sm" onClick={() => setShowAddLesson(true)} className="gap-1">
                  <Plus className="h-4 w-4" /> Aggiungi Lezione
                </Button>
              </div>
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nessuna lezione programmata</p>
              ) : (
                <div className="grid gap-2">
                  {lessons.map(lesson => (
                    <Card key={lesson.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{formatDate(lesson.lesson_date)}</p>
                          {lesson.start_time && (
                            <p className="text-xs text-muted-foreground">
                              {lesson.start_time.slice(0, 5)}{lesson.end_time && ` - ${lesson.end_time.slice(0, 5)}`}
                            </p>
                          )}
                          {lesson.topic && <p className="text-xs text-muted-foreground mt-1">{lesson.topic}</p>}
                          {lesson.instructor_name && <p className="text-xs text-muted-foreground">Docente: {lesson.instructor_name}</p>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={async () => {
                          if (confirm('Eliminare lezione?')) {
                            await deleteLesson(lesson.id);
                            loadEditionDetails(selectedEdition);
                          }
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PRESENZE TAB */}
            <TabsContent value="presenze">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Registro Presenze</h3>
                <AttendancePDFButton
                  courseName={course.name}
                  editionCode={selectedEdition.edition_code || ''}
                  startDate={selectedEdition.start_date || undefined}
                  endDate={selectedEdition.end_date || undefined}
                  location={selectedEdition.location || undefined}
                  instructorName={selectedEdition.instructor_name || undefined}
                  enrollments={enrollments}
                  lessons={lessons}
                  attendanceMap={attendanceMap}
                  durationHours={course.duration_hours}
                  renewalMonths={course.renewal_months}
                />
              </div>
              {lessons.length === 0 || enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aggiungi lezioni e iscritti per gestire le presenze
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">Dipendente</TableHead>
                        {lessons.map(l => (
                          <TableHead key={l.id} className="text-center min-w-[80px]">
                            {new Date(l.lesson_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map(enr => (
                        <TableRow key={enr.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">
                            {enr.employee ? `${enr.employee.first_name} ${enr.employee.last_name}` : 'N/D'}
                          </TableCell>
                          {lessons.map(l => {
                            const isPresent = attendanceMap[l.id]?.[enr.id] || false;
                            return (
                              <TableCell key={l.id} className="text-center">
                                <Checkbox
                                  checked={isPresent}
                                  onCheckedChange={() => handleToggleAttendance(l.id, enr.id, isPresent)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
        <BottomNav />

        {/* Add Enrollment Dialog */}
        <Dialog open={showAddEnrollment} onOpenChange={setShowAddEnrollment}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Iscrivi Dipendente</DialogTitle>
            </DialogHeader>
            <Input placeholder="Cerca dipendente..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="mb-3" />
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                  onClick={() => { handleEnrollEmployee(emp.id, emp.contact_id); setShowAddEnrollment(false); setEmployeeSearch(""); }}>
                  <div>
                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.contact?.name || ''} {emp.fiscal_code ? `• CF: ${emp.fiscal_code}` : ''}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {filteredEmployees.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun dipendente trovato</p>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Lesson Dialog */}
        <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuova Lezione</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={lessonForm.lesson_date} onChange={e => setLessonForm(f => ({ ...f, lesson_date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ora inizio</Label><Input type="time" value={lessonForm.start_time} onChange={e => setLessonForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                <div><Label>Ora fine</Label><Input type="time" value={lessonForm.end_time} onChange={e => setLessonForm(f => ({ ...f, end_time: e.target.value }))} /></div>
              </div>
              <div><Label>Argomento</Label><Input value={lessonForm.topic} onChange={e => setLessonForm(f => ({ ...f, topic: e.target.value }))} /></div>
              <div><Label>Docente</Label><Input value={lessonForm.instructor_name} onChange={e => setLessonForm(f => ({ ...f, instructor_name: e.target.value }))} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddLesson(false)}>Annulla</Button>
                <Button onClick={handleCreateLesson} disabled={!lessonForm.lesson_date}>Aggiungi</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Course detail main view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-7xl">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ChevronLeft className="h-4 w-4" /> Torna al catalogo
        </Button>

        {/* Course info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-xl font-bold">{course.name}</h1>
                  <Badge className={typeInfo.color} variant="secondary">{typeInfo.label}</Badge>
                  {course.is_mandatory && <Badge variant="destructive">Obbligatorio</Badge>}
                </div>
                {course.description && <p className="text-sm text-muted-foreground mb-3">{course.description}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {course.duration_hours && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration_hours} ore</span>}
                  {course.max_participants && <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Max {course.max_participants} partecipanti</span>}
                  {course.renewal_months && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Rinnovo ogni {course.renewal_months} mesi</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  if (confirm('Eliminare questo corso e tutte le sue edizioni?')) {
                    await deleteCourse(course.id);
                    onBack();
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edizioni del Corso</h2>
          <Button onClick={() => setShowAddEdition(true)} className="gap-1" size="sm">
            <Plus className="h-4 w-4" /> Nuova Edizione
          </Button>
        </div>

        {editions.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Nessuna edizione. Crea la prima edizione per iniziare a gestire iscrizioni e presenze.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {editions.map(ed => {
              const statusColor: Record<string, string> = {
                pianificata: "bg-blue-100 text-blue-800",
                in_corso: "bg-green-100 text-green-800",
                completata: "bg-gray-100 text-gray-800",
                annullata: "bg-red-100 text-red-800",
              };
              return (
                <Card key={ed.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEdition(ed)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{ed.edition_code || 'Edizione'}</span>
                        <Badge className={statusColor[ed.status] || ''} variant="secondary">{EDITION_STATUSES.find(s => s.value === ed.status)?.label || ed.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {ed.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(ed.start_date)}{ed.end_date && ed.end_date !== ed.start_date && ` - ${formatDate(ed.end_date)}`}</span>}
                        {ed.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ed.location}</span>}
                        {ed.instructor_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{ed.instructor_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="ghost" onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Eliminare questa edizione?')) {
                          await deleteEdition(ed.id);
                          loadEditions();
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />

      {/* Add Edition Dialog */}
      <Dialog open={showAddEdition} onOpenChange={setShowAddEdition}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuova Edizione</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Codice Edizione</Label><Input value={editionForm.edition_code} onChange={e => setEditionForm(f => ({ ...f, edition_code: e.target.value }))} placeholder="es. ED-2026-001" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Inizio</Label><Input type="date" value={editionForm.start_date} onChange={e => setEditionForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Data Fine</Label><Input type="date" value={editionForm.end_date} onChange={e => setEditionForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sede</Label><Input value={editionForm.location} onChange={e => setEditionForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><Label>Aula</Label><Input value={editionForm.classroom} onChange={e => setEditionForm(f => ({ ...f, classroom: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Docente</Label><Input value={editionForm.instructor_name} onChange={e => setEditionForm(f => ({ ...f, instructor_name: e.target.value }))} /></div>
              <div><Label>Email Docente</Label><Input type="email" value={editionForm.instructor_email} onChange={e => setEditionForm(f => ({ ...f, instructor_email: e.target.value }))} /></div>
            </div>
            <div><Label>Note</Label><Textarea value={editionForm.notes} onChange={e => setEditionForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddEdition(false)}>Annulla</Button>
              <Button onClick={handleCreateEdition}>Crea Edizione</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseDetail;
