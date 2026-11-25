export const metadata = { title: "Privacy · Gift4Me" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Privacy() {
  return (
    <main className="stack narrow">
      <h1>Privacy</h1>
      <p className="muted">Last updated November 25, 2026</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> your email address and name when you sign in.</li>
        <li><strong>People you save:</strong> names, birthdays, interests and budgets you add, so we can remind you and suggest gifts.</li>
        <li><strong>Businesses:</strong> employee names, emails, birthdays and start dates that a business uploads.</li>
        <li><strong>Orders:</strong> what was sent, to whom, the gift note and the delivery address.</li>
      </ul>

      <h2>How we use it</h2>
      <p>Only to run Gift4Me: suggesting gifts, sending reminders and gift links, and getting gifts delivered. We don&rsquo;t sell your information.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li><strong>Stripe</strong> handles payments. We never see your full card number.</li>
        <li><strong>Our suppliers</strong> get the recipient&rsquo;s name and address to ship a gift.</li>
        <li><strong>Email and hosting services</strong> that run the site and send our emails.</li>
      </ul>

      <h2>Cookies and Amazon links</h2>
      <p>
        We use cookies to keep you signed in. When you click a link to Amazon, Amazon may set its own cookies to know
        the visit came from us, so we can earn a commission. Amazon&rsquo;s privacy notice covers what Amazon collects.
      </p>

      <h2>Your choices</h2>
      <p>You can edit or delete the people you&rsquo;ve saved at any time. To delete your account and everything in it, contact us{CONTACT ? <> at <a href={`mailto:${CONTACT}`}>{CONTACT}</a></> : ""}.</p>
    </main>
  );
}
