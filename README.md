# Gift Picker

A gift app for people who buy for a lot of people. Families save their nieces,
nephews, parents and friends once. Businesses upload their employees once.
Both get reminded before every birthday and big day, pick a gift by occasion,
price and style (classy, outdoor, personal care...), and send it. The giver
pays you directly: one price, the source price plus your 10% markup, with
shipping included and no fees. Everything is drop-shipped.

## What's here

| Part | Where |
| --- | --- |
| Sign-in with Google, Facebook, Apple or an email link | `app/login`, `app/auth/callback` (Supabase Auth) |
| Quick gift finder, no saved person needed | `app/find` |
| The finder: occasion, price, up to 3 styles, then 3 ideas, 3 more, then questions | `components/GiftFlow.tsx`, `app/api/picks`, `app/api/questions`, `lib/catalog.ts`, `lib/ai.ts` |
| Saved people, dates and orders, private to each account | `app/people`, `supabase/schema.sql` |
| Import birthdays from Google Contacts | `app/api/import/google`, `app/people/ImportContacts.tsx` |
| Business sign-up (just a company name) | `app/business` |
| Employee import from a CSV or rows pasted from Excel or Google Sheets | `app/business/import`, `lib/spreadsheet.ts` |
| Work anniversaries next to birthdays | `lib/dates.ts` |
| Checkout: one price (source price + 10%), text or email a gift link or ship to an address | `app/api/checkout`, `lib/pricing.ts` |
| Gift link: the recipient adds their own address and can swap for anything worth the same or less | `app/g/[token]`, `lib/giftlink.ts` |
| Daily reminder emails 21, 7 and 2 days out (family givers and every business admin) | `app/api/cron/reminders` |
| Unopened gift links expire and the giver is told | `app/api/cron/links` |
| Your back office: orders to ship, and adding products | `app/admin` |

## Run it

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (accounts below). Put your own email in `ADMIN_EMAILS`.
3. In Supabase, open the SQL editor and run `supabase/schema.sql`, then `supabase/seed.sql` for the 66 curated starter gifts. If you already ran the first version, run both again: they only add what is new.
4. `npm run dev` and open http://localhost:3000

`npm run build` passes on Next.js 16.4.5. Set `CATALOG=sample` to try the finder before the database is set up.

## How picking works

Each product has interests (coffee, gaming...), styles (classy, outdoor,
personal care, cozy, fun, practical, techy, creative, foodie) and the
occasions it suits (none means any). The finder scores every product against
the occasion, the price range, the styles chosen and, for a saved person,
their age, likes and dislikes. Round 3 asks three questions: Claude writes
them for signed-in givers; signed-out visitors get three standard ones. You
can change the style and occasion lists in `lib/types.ts`.

## Businesses

A business signs up with its company name and uploads a spreadsheet. Column
names are matched loosely ("Full Name", "Work Email", "Date of Birth", "Hire
Date", "Department" all work), birthdays can be given without the year, and
anyone already on the list is skipped. Every admin gets the reminders, and
gifts go out as gift links to the employee's email, so the company never needs
home addresses. Ask businesses to get their employees' OK before uploading
birthdays.

Not built yet: inviting more admins, a prepaid balance, and automatic gifts
on each birthday. They fit on top of the `orgs` and `org_members` tables.

## Accounts you'll need

- **Supabase** (database and sign-in). Under Authentication > Providers, turn on Google, Facebook and Apple and paste each one's client id and secret. Add `https://<your-site>/auth/callback` as a redirect URL.
- **Google Cloud**: an OAuth client for sign-in. Asking for contacts (`contacts.readonly`) means Google will most likely need to verify the app before the public can use it: a privacy policy on your domain, a written reason, and a short video of the sign-in.
- **Meta for Developers**: a Facebook app with Facebook Login. It gives you the person's name, photo and email. Facebook no longer gives apps a way to read friends' birthdays, so the birthday data comes from Google Contacts or from the giver.
- **Apple Developer** if you want Sign in with Apple. Check Apple's current App Store rules on social sign-in before an iPhone release.
- **Stripe** for payments. Turn on Stripe Tax for the states where you must collect sales tax, then set `STRIPE_TAX=on`. Point a webhook at `/api/stripe/webhook` for `checkout.session.completed`.
- **Anthropic** API key for the round 3 questions and picks.
- **Resend** (or any email service) for reminders and gift links, with your domain verified.
- **Vercel** to host it. The crons in `vercel.json` run daily; set `CRON_SECRET` there too.

## Shipping the gifts

Charging the giver directly makes you the seller, so you're responsible for
getting the gift there, sales tax and refunds.

Every paid order (and every claimed gift link) shows up under "To ship" in
`/admin` with the address. Buy or pack it, ship it, and press "Mark shipped".
When you find suppliers who will drop-ship for you, mark their products
"Supplier drop-ships" in `/admin` and add their order call in
`lib/fulfillment.ts`.

## Before launch

- Replace the starter products with what you'll actually stock or can source, with your cost, so every pick can be shipped and the margin column in `/admin` is real.
- Decide your refund rule for gift links nobody opens (default: the link stays open 60 days, then the giver is emailed and you refund from the Stripe dashboard).
- Sales tax on gift links: the address isn't known at checkout, so Stripe Tax uses the buyer's billing address. Check with an accountant whether that's acceptable in your states.
- Write a privacy policy and terms. You'll be storing other people's birthdays, including children's and employees', so keep it to what the app needs and let givers delete people.
- Google's provider token only lasts about an hour after sign-in; the import asks the giver to sign in with Google again if it has expired.
- Upcoming dates and reminders use UTC days; switch to each giver's time zone if reminders land a day off.

## Pricing and the family discount

- A product's price in `/admin` is its **source price**, what the supplier charges you to drop-ship it. Shoppers pay that plus `MARKUP_PERCENT` (10 by default) as one price, shipping included. There is no service fee line.
- When a business sends a gift by link, the recipient's "on its way" page offers a free account. If they sign up from there and save `PERK_PEOPLE` people (3), their next gift is `PERK_PERCENT` off (10%), which is about your cost. One per person and one per gift.
- "Text a gift link" opens the giver's own Messages app with the link filled in, from the Orders page. Texting it from the app itself would need an SMS service such as Twilio.
