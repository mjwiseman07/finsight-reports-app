"use client";

import { useEffect, useState } from "react";

interface Comment {
  id: string;
  parent_comment_id: string | null;
  author_user_id: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface Props {
  requisitionId: string;
  currentUserId: string;
}

export default function CommentThread({ requisitionId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/requisitions/${requisitionId}/comments`);
    const j = await res.json();
    setComments(j?.comments ?? []);
  }

  useEffect(() => {
    refresh();
  }, [requisitionId]);

  async function post() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/requisitions/${requisitionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? `HTTP ${res.status}`);
      }
      setBody("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/requisitions/comments/${id}`, { method: "DELETE" });
    await refresh();
  }

  const roots = comments.filter((c) => !c.parent_comment_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_comment_id === id);

  return (
    <section className="border border-neutral-200 rounded-lg bg-white p-4">
      <h3 className="text-base font-semibold text-neutral-900 mb-3">Discussion</h3>
      <ul className="space-y-3">
        {roots.map((c) => (
          <li key={c.id} className="border-l-2 border-neutral-200 pl-3">
            <CommentRow c={c} currentUserId={currentUserId} onDelete={remove} />
            <ul className="mt-2 ml-4 space-y-2">
              {childrenOf(c.id).map((rc) => (
                <li key={rc.id}>
                  <CommentRow c={rc} currentUserId={currentUserId} onDelete={remove} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm"
          rows={2}
        />
        <button
          onClick={post}
          disabled={busy || !body.trim()}
          className="px-4 py-2 rounded-md bg-teal-700 text-white text-sm hover:bg-teal-800 disabled:opacity-50"
        >
          Post
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </section>
  );
}

function CommentRow({
  c,
  currentUserId,
  onDelete,
}: {
  c: Comment;
  currentUserId: string;
  onDelete: (id: string) => void;
}) {
  if (c.deleted_at) {
    return <div className="text-xs text-neutral-400 italic">Comment deleted</div>;
  }
  return (
    <div>
      <div className="text-xs text-neutral-500">
        {c.author_user_id.slice(0, 8)} · {new Date(c.created_at).toLocaleString()}
        {c.edited_at && <span className="ml-1">(edited)</span>}
      </div>
      <div className="text-sm text-neutral-800 mt-0.5 whitespace-pre-wrap">{c.body}</div>
      {c.author_user_id === currentUserId && (
        <button
          onClick={() => onDelete(c.id)}
          className="text-xs text-rose-700 hover:underline mt-1"
        >
          Delete
        </button>
      )}
    </div>
  );
}
