"use client";

import { useEffect, useState, ViewTransition } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Skeleton, { SkeletonList } from "@/components/Skeleton";
import StatCard from "@/components/StatCard";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { CheckCircle2, Clock, UserX } from "@/lib/icons";
import type { UserDTO, UserStatus } from "@/lib/types";

const STATUS_BADGE: Record<UserStatus, string> = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Declined",
};

/** ISO timestamp → "YYYY-MM-DD" (UTC, same convention as entry dates). */
const day = (iso: string) => formatDate(new Date(iso));

function MemberRow({ user, currentUserId }: { user: UserDTO; currentUserId: number }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-surface-muted/60">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        {user.status === "APPROVED" ? (
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        ) : (
          <UserX aria-hidden="true" className="h-4 w-4" />
        )}
      </span>
      <span className="text-sm font-semibold text-ink">{user.username}</span>
      {user.id === currentUserId ? (
        <span className="text-xs text-ink-muted">(you)</span>
      ) : null}
      <span className={`badge ${STATUS_BADGE[user.status]}`}>{STATUS_LABEL[user.status]}</span>
      {user.role === "ADMIN" ? <span className="badge badge-neutral">Admin</span> : null}
      <span className="text-sm text-ink-muted">
        registered {day(user.createdAt)}
        {user.decidedAt ? ` · decided ${day(user.decidedAt)}` : ""}
      </span>
    </li>
  );
}

/** Admin approvals UI (T27/T37): pending first, then members grouped by status. */
export default function AdminUsers({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<UserDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<UserDTO[]>("/api/admin/users?status=ALL");
        if (!cancelled) {
          setUsers(data);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setUsers(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load members");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function decide(user: UserDTO, action: "approve" | "reject") {
    if (action === "reject") {
      const confirmed = await confirm({
        title: `Reject "${user.username}"?`,
        description: "They will not be able to sign in.",
        confirmLabel: "Reject member",
      });
      if (!confirmed) return;
    }

    setBusyId(user.id);
    setActionError(null);
    try {
      await apiFetch<{ user: UserDTO }>(`/api/admin/users/${user.id}/${action}`, {
        method: "POST",
      });
      toast({
        tone: "success",
        title: action === "approve" ? "Member approved" : "Member declined",
        description: `${user.username} can${action === "approve" ? " now sign in" : " no longer sign in"}.`,
      });
      setRefreshKey((key) => key + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} ${user.username}`;
      setActionError(message);
      toast({
        tone: "error",
        title: action === "approve" ? "Could not approve member" : "Could not reject member",
        description: message,
      });
    } finally {
      setBusyId(null);
    }
  }

  const pending = users?.filter((user) => user.status === "PENDING") ?? [];
  const approved = users?.filter((user) => user.status === "APPROVED") ?? [];
  const rejected = users?.filter((user) => user.status === "REJECTED") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Approve new registrations and review all members. Only approved accounts can sign in."
      />

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {users === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <div role="status" className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-28 w-full rounded-panel" />
              ))}
            </div>
            <SkeletonList label="Loading members…" rows={4} />
          </div>
        )
      ) : (
        <>
          <section aria-label="Member counts" className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Pending"
              value={String(pending.length)}
              icon={Clock}
              sub="Awaiting review"
            />
            <StatCard
              label="Approved"
              value={String(approved.length)}
              icon={CheckCircle2}
              sub="Can sign in"
            />
            <StatCard
              label="Declined"
              value={String(rejected.length)}
              icon={UserX}
              sub="Blocked"
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Pending registrations</h2>
              {pending.length > 0 ? (
                <span className="badge badge-warning">{pending.length} waiting</span>
              ) : null}
            </div>
            {pending.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No pending registrations"
                description="New sign-ups will appear here for approval."
              />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
                {pending.map((user) => (
                  <ViewTransition key={user.id} enter="auto" exit="auto">
                    <li className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-surface-muted/60">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                        <Clock aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-ink">{user.username}</span>
                      <span className={`badge ${STATUS_BADGE.PENDING}`}>Pending</span>
                      <span className="text-sm text-ink-muted">
                        registered {day(user.createdAt)}
                      </span>
                      <span className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => decide(user, "approve")}
                          disabled={busyId === user.id}
                          className="btn-primary"
                        >
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                          {busyId === user.id ? "Saving…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(user, "reject")}
                          disabled={busyId === user.id}
                          className="btn-danger"
                        >
                          Reject
                        </button>
                      </span>
                    </li>
                  </ViewTransition>
                ))}
              </ul>
            )}
          </section>

          {(["APPROVED", "REJECTED"] as const).map((status) => {
            const members = status === "APPROVED" ? approved : rejected;
            return (
              <section key={status} className="space-y-3">
                <h2 className="text-sm font-semibold text-ink">
                  {STATUS_LABEL[status]}{" "}
                  <span className="font-normal text-ink-muted">({members.length})</span>
                </h2>
                {members.length === 0 ? (
                  <p className="rounded-panel border border-dashed border-line bg-surface px-4 py-3 text-sm text-ink-muted">
                    None yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
                    {members.map((user) => (
                      <ViewTransition key={user.id} enter="auto" exit="auto">
                        <MemberRow user={user} currentUserId={currentUserId} />
                      </ViewTransition>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </>
      )}

      {dialog}
    </div>
  );
}
