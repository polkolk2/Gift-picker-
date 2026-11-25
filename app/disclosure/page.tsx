import { ASSOCIATE_STATEMENT } from "@/lib/amazon";

export const metadata = { title: "Affiliate disclosure · Gift4Me" };

export default function Disclosure() {
  return (
    <main className="stack narrow">
      <h1>Affiliate disclosure</h1>
      <p><strong>{ASSOCIATE_STATEMENT}</strong></p>
      <p>
        Gift4Me is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program
        designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.
      </p>
      <p>
        Under your gift ideas, we show links to matching gifts on Amazon, marked &ldquo;More gift ideas on Amazon&rdquo;.
        If you buy through one of those links, we may earn a commission. It doesn&rsquo;t change what you pay. Prices and
        availability are set by Amazon and shown on Amazon.
      </p>
      <p>
        Gifts you send through Gift4Me itself are sold by us, at one price that includes shipping. We pick which gifts
        to show based on what you tell us about the person, not on what earns us the most.
      </p>
    </main>
  );
}
