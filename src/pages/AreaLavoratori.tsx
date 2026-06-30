import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkerLeave } from "@/hooks/useWorkerLeave";
import { useLeaveNotifications } from "@/hooks/useLeaveNotifications";
import { useWorkerNotifications } from "@/hooks/useWorkerNotifications";
import { LeaveRequestForm } from "@/components/lavoratori/LeaveRequestForm";
import { LeaveRequestList } from "@/components/lavoratori/LeaveRequestList";
import { LeaveApprovalQueue } from "@/components/lavoratori/LeaveApprovalQueue";
import { LeaveBalanceCard } from "@/components/lavoratori/LeaveBalanceCard";
import { LeaveCalendar } from "@/components/lavoratori/LeaveCalendar";
import { LeaveExportDialog } from "@/components/lavoratori/LeaveExportDialog";
import { NotificationCenter } from "@/components/lavoratori/NotificationCenter";
import { NotificationSettings } from "@/components/lavoratori/NotificationSettings";
import { LeaveAuditLog } from "@/components/lavoratori/LeaveAuditLog";
import { ChatPanel } from "@/components/lavoratori/ChatPanel";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Bell } from "lucide-react";

export default function AreaLavoratori() {
  const { isAdmin, isContabilita } = useUserRole();
  const canApprove = isAdmin || isContabilita;
  const { myRequests, allRequests, myBalance, cancelRequest, refresh } = useWorkerLeave();
  const [tab, setTab] = useState("richieste");
  useLeaveNotifications();
  const { unreadCount } = useWorkerNotifications();

  const tabCount = 4 + (canApprove ? 2 : 0); // base 4 + approvazioni + registro

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-24 pt-4">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Area Lavoratori</h1>
          </div>
          <NotificationSettings />
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            if ((v === "approvazioni" || v === "registro") && !canApprove) return;
            setTab(v);
          }}
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
            <TabsTrigger value="richieste">Richieste</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="notifiche" className="relative">
              <Bell className="h-4 w-4 mr-1" />
              <span>Notifiche</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            {canApprove && <TabsTrigger value="approvazioni">Approvazioni</TabsTrigger>}
            {canApprove && <TabsTrigger value="registro">Registro</TabsTrigger>}
          </TabsList>

          <TabsContent value="richieste" className="space-y-4 mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Nuova richiesta</CardTitle></CardHeader>
                <CardContent><LeaveRequestForm /></CardContent>
              </Card>
              <LeaveBalanceCard balance={myBalance} />
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Le mie richieste</CardTitle>
                <LeaveExportDialog requests={myRequests} />
              </CardHeader>
              <CardContent>
                <LeaveRequestList requests={myRequests} onCancel={cancelRequest} onChange={refresh} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <ChatPanel />
          </TabsContent>

          <TabsContent value="calendario" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Assenze in programma</CardTitle></CardHeader>
              <CardContent><LeaveCalendar requests={allRequests} /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifiche" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <NotificationCenter />
              </CardContent>
            </Card>
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvazioni" className="mt-4">
              <div className="space-y-2">
                <div className="flex justify-end">
                  <LeaveExportDialog requests={allRequests} />
                </div>
                <LeaveApprovalQueue />
              </div>
            </TabsContent>
          )}

          {canApprove && (
            <TabsContent value="registro" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <LeaveAuditLog />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
