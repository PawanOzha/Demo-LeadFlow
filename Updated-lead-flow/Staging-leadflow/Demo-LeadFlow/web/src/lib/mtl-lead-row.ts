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
  createdBy: { name: string };
  assignedSalesExec: { name: string; id: string } | null;
};
