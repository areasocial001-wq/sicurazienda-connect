import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useCourses, Course, CourseEdition } from "@/hooks/useCourses";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Plus, Search, Calendar, Users, Clock,
  BookOpen, AlertTriangle, CheckCircle2, ChevronRight,
  BarChart3, Filter
} from "lucide-react";
import AddCourseDialog from "@/components/courses/AddCourseDialog";
import CourseDetail from "@/components/courses/CourseDetail";
import CourseCalendarView from "@/components/courses/CourseCalendarView";
import CourseExpiryTracker from "@/components/courses/CourseExpiryTracker";
import CourseImport from "@/components/courses/CourseImport";
import CourseHistoryImport from "@/components/courses/CourseHistoryImport";
import CourseBrandingSettings from "@/components/courses/CourseBrandingSettings";

const COURSE_TYPES = [
  { value: "sicurezza", label: "Sicurezza", color: "bg-red-100 text-red-800" },
  { value: "primo_soccorso", label: "Primo Soccorso", color: "bg-green-100 text-green-800" },
  { value: "antincendio", label: "Antincendio", color: "bg-orange-100 text-orange-800" },
  { value: "rls", label: "RLS", color: "bg-blue-100 text-blue-800" },
  { value: "preposti", label: "Preposti", color: "bg-purple-100 text-purple-800" },
  { value: "dirigenti", label: "Dirigenti", color: "bg-indigo-100 text-indigo-800" },
  { value: "attrezzature", label: "Attrezzature", color: "bg-yellow-100 text-yellow-800" },
  { value: "altro", label: "Altro", color: "bg-gray-100 text-gray-800" },
];

export function getCourseTypeInfo(type: string) {
  return COURSE_TYPES.find(t => t.value === type) || COURSE_TYPES[COURSE_TYPES.length - 1];
}

const CourseManagement = () => {
  const { user } = useAuth();
  const { courses, loading, fetchCourses, fetchEditions, editions } = useCourses();
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [activeTab, setActiveTab] = useState("catalogo");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showHistoryImport, setShowHistoryImport] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEditions();
    }
  }, [user, fetchEditions]);

  const filteredCourses = courses.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || c.course_type === typeFilter;
    return matchSearch && matchType;
  });

  // Stats
  const totalCourses = courses.length;
  const mandatoryCourses = courses.filter(c => c.is_mandatory).length;
  const activeEditions = editions.filter(e => e.status === 'in_corso' || e.status === 'pianificata').length;
  const completedEditions = editions.filter(e => e.status === 'completata').length;

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => { setSelectedCourse(null); fetchCourses(); }} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-7xl">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestione Corsi</h1>
              <p className="text-sm text-muted-foreground">Pianifica, gestisci e monitora i corsi di formazione</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CourseBrandingSettings />
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
              <Search className="h-4 w-4" /> Importa Excel
            </Button>
            <Button onClick={() => setShowAddCourse(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nuovo Corso
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-xs text-muted-foreground">Corsi a catalogo</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{mandatoryCourses}</p>
                <p className="text-xs text-muted-foreground">Obbligatori</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activeEditions}</p>
                <p className="text-xs text-muted-foreground">Edizioni attive</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedEditions}</p>
                <p className="text-xs text-muted-foreground">Completate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="catalogo" className="gap-1.5">
              <BookOpen className="h-4 w-4" /> Catalogo
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-1.5">
              <Calendar className="h-4 w-4" /> Calendario
            </TabsTrigger>
            <TabsTrigger value="scadenzario" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Scadenzario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca corsi..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                <Button
                  variant={typeFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(null)}
                >
                  Tutti
                </Button>
                {COURSE_TYPES.map(t => (
                  <Button
                    key={t.value}
                    variant={typeFilter === t.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Course list */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
            ) : filteredCourses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nessun corso trovato</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowAddCourse(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Crea il primo corso
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredCourses.map(course => {
                  const typeInfo = getCourseTypeInfo(course.course_type);
                  const courseEditions = editions.filter(e => e.course_id === course.id);
                  const activeCount = courseEditions.filter(e => e.status === 'pianificata' || e.status === 'in_corso').length;
                  return (
                    <Card
                      key={course.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{course.name}</h3>
                              <Badge className={typeInfo.color} variant="secondary">
                                {typeInfo.label}
                              </Badge>
                              {course.is_mandatory && (
                                <Badge variant="destructive" className="text-xs">Obbligatorio</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {course.description || 'Nessuna descrizione'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {course.duration_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {course.duration_hours}h
                                </span>
                              )}
                              {course.max_participants && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" /> Max {course.max_participants}
                                </span>
                              )}
                              {course.renewal_months && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Rinnovo ogni {course.renewal_months} mesi
                                </span>
                              )}
                              {activeCount > 0 && (
                                <Badge variant="outline" className="text-xs">{activeCount} edizioni attive</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendario">
            <CourseCalendarView editions={editions} onEditionClick={(e) => {
              const course = courses.find(c => c.id === e.course_id);
              if (course) setSelectedCourse(course);
            }} />
          </TabsContent>

          <TabsContent value="scadenzario">
            <CourseExpiryTracker />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />

      <AddCourseDialog
        open={showAddCourse}
        onOpenChange={setShowAddCourse}
        courseTypes={COURSE_TYPES}
      />
      <CourseImport
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={() => { fetchCourses(); fetchEditions(); }}
      />
    </div>
  );
};

export default CourseManagement;
