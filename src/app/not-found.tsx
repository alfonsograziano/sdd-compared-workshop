import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
      <p>This task does not exist.</p>
      <Link href="/" className="btn">
        Back to the board
      </Link>
    </div>
  );
}
