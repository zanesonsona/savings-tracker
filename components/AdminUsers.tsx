"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/dates";
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

const BUTTON_PRIMARY = "btn-primary";

const BUTTON_DANGER = "btn-danger";

/** ISO timestamp → "YYYY-MM-DD" (UTC, same convention as entry dates). */
const day = (iso: string) => formatDate(new Date(iso));

function MemberRow({ user, currentUserId }: { user: UserDTO; currentUserId: number }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="font-medium text-ink">{user.username}</span>
      {user.id === currentUserId ? <span className="text-xs text-ink-muted">(you)</span> : null}
      <span className={`badge ${STATUS_BADGE[user.status]}`}>
        {STATUS_LABEL[user.status]}
      </span>
      {user.role === "ADMIN" ? <span className="badge badge-neutral">Admin</span> : null}
      <span className="text-sm text-ink-muted">
        registered {day(user.createdAt)}
        {user.decidedAt ? ` · decided ${day(user.decidedAt)}` : ""}
      </span>
    </li>
  );
}

/** Admin approvals UI (T27): pending first, then members grouped by status. */
export default function AdminUsers({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<UserDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
    if (
      action === "reject" &&
      !window.confirm(`Reject "${user.username}"? They will not be able to sign in.`)
    ) {
      return;
    }
    setBusyId(user.id);
    setActionError(null);
    try {
      await apiFetch<{ user: UserDTO }>(`/api/admin/users/${user.id}/${action}`, {
        method: "POST",
      });
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : `Failed to ${action} ${user.username}`,
      );
    } finally {
      setBusyId(null);
    }
  }

  const pending = users?.filter((user) => user.status === "PENDING") ?? [];
  const approved = users?.filter((user) => user.status === "APPROVED") ?? [];
  const rejected = users?.filter((user) => user.status === "REJECTED") ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">User management</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Approve new registrations and review all members.
          </p>
        </div>
        {users ? (
          <div className="rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted">
            <span className="font-medium text-warning">{pending.length}</span> pending ·{" "}
            <span className="font-medium text-success">{approved.length}</span> approved ·{" "}
            <span className="font-medium text-danger">{rejected.length}</span> declined
          </div>
        ) : null}
      </header>

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {users === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <p className="text-sm text-ink-muted">Loading…</p>
        )
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Pending registrations</h2>
            {pending.length === 0 ? (
              <EmptyState
                title="No pending registrations"
                description="New sign-ups will appear here for approval."
              />
            ) : (
              <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
                {pending.map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="font-medium text-ink">{user.username}</span>
                    <span className={`badge ${STATUS_BADGE.PENDING}`}>Pending</span>
                    <span className="text-sm text-ink-muted">
                      registered {day(user.createdAt)}
                    </span>
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => decide(user, "approve")}
                        disabled={busyId === user.id}
                        className={BUTTON_PRIMARY}
                      >
                        {busyId === user.id ? "Saving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(user, "reject")}
                        disabled={busyId === user.id}
                        className={BUTTON_DANGER}
                      >
                        Reject
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(["APPROVED", "REJECTED"] as const).map((status) => {
            const members = status === "APPROVED" ? approved : rejected;
            return (
              <section key={status} className="space-y-3">
                <h2 className="text-sm font-medium text-ink">
                  {STATUS_LABEL[status]}{" "}
                  <span className="font-normal text-ink-muted">({members.length})</span>
                </h2>
                {members.length === 0 ? (
                  <p className="text-sm text-ink-muted">None yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
                    {members.map((user) => (
                      <MemberRow key={user.id} user={user} currentUserId={currentUserId} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
