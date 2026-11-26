// Bottom task bar, shown on every page (Phase 3 fix).
//
// Four doors: Home (browse), Orders (what you have bought), Cart (your
// food), Account (sign in or your details). Mobile-first: fixed to the
// bottom, big tap targets. A server component — it never knows who is
// signed in, it just links.
import Link from "next/link";

const linkClass =
  "px-2 py-3.5 text-center text-sm font-bold text-stone-700 transition hover:text-emerald-700";

export function Nav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-4">
        <Link href="/" className={linkClass}>
          Home
        </Link>
        <Link href="/orders" className={linkClass}>
          Orders
        </Link>
        <Link href="/cart" className={linkClass}>
          Cart
        </Link>
        <Link href="/account" className={linkClass}>
          Account
        </Link>
      </div>
    </nav>
  );
}