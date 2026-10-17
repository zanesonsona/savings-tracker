"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import type { UserDTO, UserStatus } from "@/lib/types";

const STATUS_BADGE: Record<UserStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Declined",
};

const BUTTON_PRIMARY =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_DANGER =
  "rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

/** ISO timestamp → "YYYY-MM-DD" (UTC, same convention as entry dates). */
const day = (iso: string) => formatDate(new Date(iso));

function MemberRow({ user, currentUserId }: { user: UserDTO; currentUserId: number }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="font-medium text-slate-900">{user.username}</span>
      {user.id === currentUserId ? <span className="text-xs text-slate-400">(you)</span> : null}
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status]}`}>
        {STATUS_LABEL[user.status]}
      </span>
      {user.role === "ADMIN" ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          Admin
        </span>
      ) : null}
      <span className="text-sm text-slate-400">
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
          <h1 className="text-2xl font-semibold text-slate-900">User management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Approve new registrations and review all members.
          </p>
        </div>
        {users ? (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
            <span className="font-medium text-amber-700">{pending.length}</span> pending ·{" "}
            <span className="font-medium text-emerald-700">{approved.length}</span> approved ·{" "}
            <span className="font-medium text-red-600">{rejected.length}</span> declined
          </div>
        ) : null}
      </header>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      {users === null ? (
        loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-slate-900">Pending registrations</h2>
            {pending.length === 0 ? (
              <EmptyState
                title="No pending registrations"
                description="New sign-ups will appear here for approval."
              />
            ) : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {pending.map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="font-medium text-slate-900">{user.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE.PENDING}`}
                    >
                      Pending
                    </span>
                    <span className="text-sm text-slate-400">
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
                <h2 className="text-sm font-medium text-slate-900">
                  {STATUS_LABEL[status]}{" "}
                  <span className="font-normal text-slate-400">({members.length})</span>
                </h2>
                {members.length === 0 ? (
                  <p className="text-sm text-slate-400">None yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
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
