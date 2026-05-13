export type MtlLeadRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  leadScore: number | null;
  salesStage: string;
  execDeadlineAt: string | null;
  assignedSalesExecId: string | null;
  createdBy: { id: string; name: string; image: string | null };
  assignedSalesExec: { id: string; name: string; image: string | null } | null;
};
