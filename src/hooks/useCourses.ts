import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Course {
  id: string;
  name: string;
  course_type: string;
  description?: string | null;
  duration_hours?: number | null;
  max_participants?: number | null;
  is_mandatory: boolean;
  renewal_months?: number | null;
  category?: string | null;
  notes?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourseEdition {
  id: string;
  course_id: string;
  edition_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  classroom?: string | null;
  instructor_name?: string | null;
  instructor_email?: string | null;
  status: string;
  notes?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface CourseEnrollment {
  id: string;
  edition_id: string;
  employee_id?: string | null;
  contact_id?: string | null;
  enrollment_date?: string | null;
  status: string;
  certificate_issued: boolean;
  certificate_date?: string | null;
  certificate_expiry?: string | null;
  result?: string | null;
  score?: number | null;
  notes?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  employee?: { first_name: string; last_name: string; fiscal_code?: string | null };
  contact?: { name: string; company?: string | null };
}

export interface CourseLesson {
  id: string;
  edition_id: string;
  lesson_date: string;
  start_time?: string | null;
  end_time?: string | null;
  topic?: string | null;
  instructor_name?: string | null;
  notes?: string | null;
  user_id: string;
  created_at: string;
}

export interface CourseAttendance {
  id: string;
  lesson_id: string;
  enrollment_id: string;
  present: boolean;
  entry_time?: string | null;
  exit_time?: string | null;
  notes?: string | null;
  created_at: string;
}

export function useCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching courses:', error);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  }, [user]);

  const fetchEditions = useCallback(async (courseId?: string) => {
    if (!user) return;
    let query = supabase
      .from('course_editions')
      .select('*, course:courses(*)')
      .order('start_date', { ascending: false });
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching editions:', error);
    } else {
      setEditions((data as any) || []);
    }
  }, [user]);

  const fetchEnrollments = useCallback(async (editionId: string) => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*, employee:crm_employees(first_name, last_name, fiscal_code), contact:crm_contacts(name, company)')
      .eq('edition_id', editionId)
      .order('created_at');
    if (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
    return (data as any) || [];
  }, [user]);

  const fetchLessons = useCallback(async (editionId: string) => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('edition_id', editionId)
      .order('lesson_date');
    if (error) {
      console.error('Error fetching lessons:', error);
      return [];
    }
    return data || [];
  }, [user]);

  const fetchAttendance = useCallback(async (lessonId: string) => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('course_attendance')
      .select('*')
      .eq('lesson_id', lessonId);
    if (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
    return data || [];
  }, [user]);

  // CRUD: Courses
  const createCourse = useCallback(async (course: Partial<Course>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...course, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Corso creato' });
    fetchCourses();
    return data;
  }, [user, toast, fetchCourses]);

  const updateCourse = useCallback(async (id: string, updates: Partial<Course>) => {
    const { error } = await supabase.from('courses').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Corso aggiornato' });
    fetchCourses();
    return true;
  }, [toast, fetchCourses]);

  const deleteCourse = useCallback(async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Corso eliminato' });
    fetchCourses();
    return true;
  }, [toast, fetchCourses]);

  // CRUD: Editions
  const createEdition = useCallback(async (edition: Partial<CourseEdition>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('course_editions')
      .insert({ ...edition, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Edizione creata' });
    return data;
  }, [user, toast]);

  const updateEdition = useCallback(async (id: string, updates: Partial<CourseEdition>) => {
    const { error } = await supabase.from('course_editions').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Edizione aggiornata' });
    return true;
  }, [toast]);

  const deleteEdition = useCallback(async (id: string) => {
    const { error } = await supabase.from('course_editions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Edizione eliminata' });
    return true;
  }, [toast]);

  // CRUD: Enrollments
  const createEnrollment = useCallback(async (enrollment: Partial<CourseEnrollment>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({ ...enrollment, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Iscrizione aggiunta' });
    return data;
  }, [user, toast]);

  const updateEnrollment = useCallback(async (id: string, updates: Partial<CourseEnrollment>) => {
    const { error } = await supabase.from('course_enrollments').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, [toast]);

  const deleteEnrollment = useCallback(async (id: string) => {
    const { error } = await supabase.from('course_enrollments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Iscrizione rimossa' });
    return true;
  }, [toast]);

  // CRUD: Lessons
  const createLesson = useCallback(async (lesson: Partial<CourseLesson>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('course_lessons')
      .insert({ ...lesson, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Lezione aggiunta' });
    return data;
  }, [user, toast]);

  const deleteLesson = useCallback(async (id: string) => {
    const { error } = await supabase.from('course_lessons').delete().eq('id', id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Lezione eliminata' });
    return true;
  }, [toast]);

  // CRUD: Attendance
  const upsertAttendance = useCallback(async (lessonId: string, enrollmentId: string, present: boolean, extras?: Partial<CourseAttendance>) => {
    const { error } = await supabase
      .from('course_attendance')
      .upsert({ lesson_id: lessonId, enrollment_id: enrollmentId, present, ...extras } as any, { onConflict: 'lesson_id,enrollment_id' });
    if (error) {
      console.error('Error upserting attendance:', error);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (user) fetchCourses();
  }, [user, fetchCourses]);

  return {
    courses, editions, loading,
    fetchCourses, fetchEditions, fetchEnrollments, fetchLessons, fetchAttendance,
    createCourse, updateCourse, deleteCourse,
    createEdition, updateEdition, deleteEdition,
    createEnrollment, updateEnrollment, deleteEnrollment,
    createLesson, deleteLesson,
    upsertAttendance,
  };
}
