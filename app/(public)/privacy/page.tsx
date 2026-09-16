import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What On the House collects, why, and how to have it deleted.",
};

const CONTACT = "madsoul1100@gmail.com";
const UPDATED = "16 September 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-cream">
      <Link href="/" className="text-xs font-black uppercase tracking-[0.3em] text-gold-brand">
        On the House
      </Link>
      <h1 className="mt-4 text-3xl font-black text-white">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-cream/85 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <p>
            On the House (games.madsoul.in) helps friends run offline house-party games — tracking poker buy-ins and
            settlements, and running group challenges called Rallies. This page explains what we collect and what
            happens to it.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Your account.</strong> When you sign in with Google or email, we receive your name, email address
              and profile picture. We use these only to sign you in and show your name.
            </li>
            <li>
              <strong>Players you add.</strong> Hosts can save the names of people they play with, and optionally
              their UPI IDs so settlements can be paid.
            </li>
            <li>
              <strong>Game records.</strong> Poker buy-ins, chip counts, results, who owes whom, and payment status.
            </li>
            <li>
              <strong>Rally activity.</strong> Check-ins, the messages and proof photos you post with them, and votes.
            </li>
          </ul>
        </section>

        <section>
          <h2>Who can see it</h2>
          <ul>
            <li>
              <strong>Shared game links.</strong> Anyone with a game&apos;s link can see its players, buy-ins, results
              and settlement — including the UPI IDs needed to pay. Only share links with the people at the table.
            </li>
            <li>
              <strong>Rallies.</strong> Check-ins and standings are visible to that rally&apos;s members. Proof photos
              are stored at unguessable web addresses; anyone who has a photo&apos;s address can open it.
            </li>
            <li>We do not sell your data, show ads, or share it with anyone for marketing.</li>
          </ul>
        </section>

        <section>
          <h2>Services we rely on</h2>
          <ul>
            <li>
              <strong>Clerk</strong> — sign-in and account management.
            </li>
            <li>
              <strong>Supabase</strong> — database and photo storage.
            </li>
            <li>
              <strong>Vercel</strong> — hosting the app.
            </li>
            <li>
              <strong>Google</strong> — only if you choose &ldquo;Sign in with Google&rdquo;. We request your basic
              profile and email, nothing else.
            </li>
          </ul>
          <p className="mt-2">These providers process data on our behalf and may store it outside India.</p>
        </section>

        <section>
          <h2>Money</h2>
          <p>
            On the House never holds, moves or processes money. UPI buttons open your own payment app; payments are
            marked as paid by hand.
          </p>
        </section>

        <section>
          <h2>Deleting your data</h2>
          <p>
            Email <a className="font-bold text-gold-brand underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> from the
            address you signed in with and we will delete your account and the records you created. If a host added
            you as a player and you want your name or UPI ID removed, write to the same address.
          </p>
        </section>

        <section>
          <h2>Age</h2>
          <p>On the House is meant for adults (18+).</p>
        </section>

        <section>
          <h2>Changes and contact</h2>
          <p>
            If this policy changes we will update the date above. Questions:{" "}
            <a className="font-bold text-gold-brand underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-muted">
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
      </p>
    </main>
  );
}
