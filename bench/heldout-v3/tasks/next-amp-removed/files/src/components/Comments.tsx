import { useState } from "react";

export function Comments({ slug }: { slug: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <p className="comments">Thanks, your comment is awaiting review.</p>;
  return (
    <form
      className="comments"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch(`/api/comments/${slug}`, { method: "POST", body: JSON.stringify({ text }) });
        setSent(true);
      }}
    >
      <label htmlFor="comment">Leave a comment</label>
      <textarea id="comment" name="comment" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">Post comment</button>
    </form>
  );
}
