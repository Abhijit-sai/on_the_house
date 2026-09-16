import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The ground rules for using On the House.",
};

const CONTACT = "madsoul1100@gmail.com";
const UPDATED = "16 September 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-cream">
      <Link href="/" className="text-xs font-black uppercase tracking-[0.3em] text-gold-brand">
        On the House
      </Link>
      <h1 className="mt-4 text-3xl font-black text-white">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-cream/85 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <p>By using On the House (games.madsoul.in) you agree to these terms. If you don&apos;t agree, please don&apos;t use it.</p>
        </section>

        <section>
          <h2>What On the House is</h2>
          <p>
            A scorekeeping and coordination tool for games you play in person with people you know. It is not a
            gambling service: no games are played online, and On the House never holds, transfers or processes money.
          </p>
        </section>

        <section>
          <h2>Your responsibilities</h2>
          <ul>
            <li>You must be 18 or older.</li>
            <li>
              You are responsible for making sure any game you run, and any money that changes hands between players, is
              lawful where you live.
            </li>
            <li>Only add people who are happy to be added, and only share game and rally links with them.</li>
            <li>Don&apos;t post content in rallies that is illegal, abusive, or that you don&apos;t have the right to share.</li>
          </ul>
        </section>

        <section>
          <h2>Calculations</h2>
          <p>
            Settlements, standings and streaks are calculated from what you enter. Check the numbers before anyone pays
            — you and your group are responsible for the payments you make and mark as paid.
          </p>
        </section>

        <section>
          <h2>The service</h2>
          <p>
            On the House is provided as is, without warranties. It may change, be unavailable at times, or lose data, so
            don&apos;t rely on it as your only record. We may suspend accounts that misuse it. To the extent the law
            allows, we are not liable for losses arising from its use.
          </p>
        </section>

        <section>
          <h2>Privacy</h2>
          <p>
            How we handle your data is described in the{" "}
            <Link href="/privacy" className="font-bold text-gold-brand underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            <a className="font-bold text-gold-brand underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </section>
      </div>
    </main>
  );
}
