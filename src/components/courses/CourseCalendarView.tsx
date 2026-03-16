import { CourseEdition } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User } from "lucide-react";

interface Props {
  editions: CourseEdition[];
  onEditionClick: (edition: CourseEdition) => void;
}

const statusColors: Record<string, string> = {
  pianificata: "bg-blue-100 text-blue-800",
  in_corso: "bg-green-100 text-green-800",
  completata: "bg-gray-100 text-gray-800",
  annullata: "bg-red-100 text-red-800",
};

const CourseCalendarView = ({ editions, onEditionClick }: Props) => {
  const now = new Date();
  const upcoming = editions
    .filter(e => e.start_date && new Date(e.start_date) >= now && e.status !== 'annullata')
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());

  const ongoing = editions.filter(e => e.status === 'in_corso');
  const past = editions
    .filter(e => e.status === 'completata')
    .sort((a, b) => new Date(b.start_date || '').getTime() - new Date(a.start_date || '').getTime())
    .slice(0, 10);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderEdition = (e: CourseEdition) => (
    <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onEditionClick(e)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm truncate">{(e.course as any)?.name || 'Corso'}</span>
          <Badge className={statusColors[e.status] || ''} variant="secondary">{e.status}</Badge>
        </div>
        {e.edition_code && <p className="text-xs text-muted-foreground mb-1">Cod: {e.edition_code}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {e.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(e.start_date)}
              {e.end_date && e.end_date !== e.start_date && ` - ${formatDate(e.end_date)}`}
            </span>
          )}
          {e.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>
          )}
          {e.instructor_name && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{e.instructor_name}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {ongoing.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-green-700">🟢 In Corso</h3>
          <div className="grid gap-2">{ongoing.map(renderEdition)}</div>
        </div>
      )}
      <div>
        <h3 className="font-semibold text-sm mb-2 text-blue-700">📅 Prossime Edizioni ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna edizione pianificata</p>
        ) : (
          <div className="grid gap-2">{upcoming.map(renderEdition)}</div>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2 text-muted-foreground">✅ Completate (ultime 10)</h3>
          <div className="grid gap-2">{past.map(renderEdition)}</div>
        </div>
      )}
    </div>
  );
};

export default CourseCalendarView;
