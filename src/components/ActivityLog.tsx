"use client";
import { useState, useEffect } from "react";

interface AuditChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface AuditLogEntry {
  _id: string;
  action: string;
  entity: string;
  documentType?: string;
  documentId?: string;
  documentNumber?: string;
  changes?: AuditChange[];
  summary?: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

interface ActivityLogProps {
  documentType: "quotation" | "invoice";
  documentId: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  edit: { label: "Edited", color: "blue", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  status_change: { label: "Status Changed", color: "amber", icon: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" },
  payment_added: { label: "Payment Recorded", color: "green", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  create: { label: "Created", color: "purple", icon: "M12 4v16m8-8H4" },
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  gray: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-500" },
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function ActivityLog({ documentType, documentId }: ActivityLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/audit-logs?documentType=${documentType}&documentId=${encodeURIComponent(documentId)}`
        );
        if (!res.ok) throw new Error("Failed to fetch activity log");
        const data = await res.json();
        if (!cancelled) {
          setLogs(data.data || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load activity log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLogs();
    return () => { cancelled = true; };
  }, [documentType, documentId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">Activity Log</h3>
            <p className="text-xs text-gray-500">Loading edit history...</p>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1e3a5f] border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">Activity Log</h3>
            <p className="text-xs text-gray-500">Edit history & audit trail</p>
          </div>
        </div>
        <div className="p-6 text-center text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Activity Log</h3>
          <p className="text-xs text-gray-500">
            {logs.length === 0
              ? "No edits recorded yet"
              : `${logs.length} ${logs.length === 1 ? "entry" : "entries"} · chronological order`}
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No edit history available</p>
          <p className="text-xs text-gray-400 mt-1">Changes made to this document will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map((log) => {
            const actionInfo = ACTION_LABELS[log.action] || {
              label: log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              color: "gray",
              icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            };
            const colors = COLOR_CLASSES[actionInfo.color] || COLOR_CLASSES.gray;
            const hasChanges = (log.changes || []).length > 0;
            const isExpanded = expandedIds.has(log._id);

            return (
              <div key={log._id} className="px-4 py-3 hover:bg-gray-50/50 transition">
                <div className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className={`flex-shrink-0 w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center mt-0.5`}>
                    <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionInfo.icon} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {actionInfo.label}
                        </span>
                        {log.summary && (
                          <span className="text-sm text-gray-700 font-medium">{log.summary}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>

                    {/* User info */}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>by {log.userName || log.userEmail || "System"}</span>
                    </div>

                    {/* Expandable changes */}
                    {hasChanges && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleExpand(log._id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <svg
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {isExpanded ? "Hide" : "Show"} {log.changes!.length} field {log.changes!.length === 1 ? "change" : "changes"}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                            {log.changes!.map((change, idx) => {
                              // Determine change type for styling
                              const isAdded = change.label.includes("Added") || change.oldValue === "(new)";
                              const isRemoved = change.label.includes("Removed") || change.newValue === "(removed)";
                              const isModified = change.label.includes("Modified");
                              const isRenamed = change.label.includes("Renamed");

                              const badgeColor = isAdded
                                ? "bg-green-100 text-green-800 border-green-200"
                                : isRemoved
                                ? "bg-red-100 text-red-800 border-red-200"
                                : isModified
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : isRenamed
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "";

                              return (
                                <div key={idx} className="text-xs">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {badgeColor ? (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeColor}`}>
                                        {isAdded && "＋"}
                                        {isRemoved && "－"}
                                        {isModified && "✎"}
                                        {isRenamed && "↔"}
                                        {!isAdded && !isRemoved && !isModified && !isRenamed && "•"}
                                      </span>
                                    ) : null}
                                    <span className="font-semibold text-gray-700">{change.label}</span>
                                  </div>
                                  <div className="flex flex-col gap-1 ml-0.5">
                                    {/* Old value */}
                                    {change.oldValue && change.oldValue !== "(new)" && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-red-100 text-red-600 text-[10px] font-bold mt-0.5">−</span>
                                        <span className={`px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 ${!isRemoved ? 'line-through' : ''} break-all`}>
                                          {change.oldValue}
                                        </span>
                                      </div>
                                    )}
                                    {/* New value */}
                                    {change.newValue && change.newValue !== "(removed)" && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-green-100 text-green-600 text-[10px] font-bold mt-0.5">+</span>
                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 font-medium break-all">
                                          {change.newValue}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}