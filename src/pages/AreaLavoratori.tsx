import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkerLeave } from "@/hooks/useWorkerLeave";
import { useLeaveNotifications } from "@/hooks/useLeaveNotifications";
import { LeaveRequestForm } from "@/components/lavoratori/LeaveRequestForm";
import { LeaveRequestList } from "@/components/lavoratori/LeaveRequestList";
import { LeaveApprovalQueue } from "@/components/lavoratori/LeaveApprovalQueue";
import { LeaveBalanceCard } from "@/components/lavoratori/LeaveBalanceCard";
import { LeaveCalendar } from "@/components/lavoratori/LeaveCalendar";
import { LeaveExportDialog } from "@/components/lavoratori/LeaveExportDialog";
import { ChatPanel } from "@/components/lavoratori/ChatPanel";
import { Briefcase } from "lucide-react";

export default function AreaLavoratori() {
  const { isAdmin, isContabilita, loading } = useUserRole();
  const canApprove = isAdmin || isContabilita;
  const { myRequests, allRequests, myBalance, cancelRequest, refresh } = useWorkerLeave();
  const [tab, setTab] = useState("richieste");
  useLeaveNotifications();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-24 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Area Lavoratori</h1>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            // Hard guard: ignore the approvazioni tab for non-approvers (defence in depth).
            if (v === "approvazioni" && !canApprove) return;
            setTab(v);
          }}
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${canApprove ? 4 : 3}, 1fr)` }}>
            <TabsTrigger value="richieste">Richieste</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            {canApprove && <TabsTrigger value="approvazioni">Approvazioni</TabsTrigger>}
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
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
