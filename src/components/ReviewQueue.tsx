import type { ReactNode } from "react";
import { Clock3, WalletCards } from "lucide-react";
import type { LedgerEntry, LedgerSummary, RequestStatus } from "../types";
import { formatMoney } from "../utils/ledger";

interface ReviewQueueProps {
  summary: LedgerSummary;
  entries: LedgerEntry[];
  onOpenDetail: (id: number) => void;
  onReview: (id: number, status: RequestStatus) => void;
}

export function ReviewQueue({ summary, entries, onOpenDetail, onReview }: ReviewQueueProps) {
  return (
    <section className="panel review-panel" id="review-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">审批中心</p>
          <h2>待审队列</h2>
        </div>
        <span className="save-pill">财务端优先处理待审单据</span>
      </div>

      <div className="review-metrics">
        <QueueMetric icon={<Clock3 size={18} />} label="待处理" value={`${summary.pendingCount} 条`} tone="amber" />
        <QueueMetric icon={<WalletCards size={18} />} label="待审金额" value={formatMoney(summary.pendingExpense)} tone="blue" />
      </div>

      <div className="review-queue">
        {entries.length ? (
          entries.map((entry) => (
            <article className="review-item" key={entry.id}>
              <div>
                <strong>{entry.note}</strong>
                <p>
                  {entry.applicantName} · {entry.department} · {entry.category} · {entry.date}
                </p>
              </div>
              <span className="amount-text">{formatMoney(entry.amount)}</span>
              <div className="row-actions">
                <button className="mini-button" type="button" onClick={() => onOpenDetail(entry.id)}>
                  详情
                </button>
                <button className="mini-button approve" type="button" onClick={() => onReview(entry.id, "approved")}>
                  通过
                </button>
                <button className="mini-button reject" type="button" onClick={() => onReview(entry.id, "rejected")}>
                  驳回
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state compact">
            <p>当前没有待审申请，财务端可以查看台账或预算占用情况。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function QueueMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "blue" | "amber";
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
