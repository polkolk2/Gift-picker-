import { savePerson } from "./actions";
import { INTERESTS, type Recipient } from "@/lib/types";

export default function PersonForm({ person }: { person?: Recipient }) {
  return (
    <form action={savePerson} className="stack card">
      {person && <input type="hidden" name="id" value={person.id} />}
      <div className="grid">
        <label>Name<input name="name" required defaultValue={person?.name} /></label>
        <label>Relationship<input name="relationship" placeholder="niece, nephew, mom..." defaultValue={person?.relationship ?? ""} /></label>
        <label>Birthdate<input name="birthdate" type="date" defaultValue={person?.birthdate ?? ""} /></label>
        <label>Sex
          <select name="sex" defaultValue={person?.sex ?? "any"}>
            <option value="any">Prefer not to say</option><option value="f">Female</option><option value="m">Male</option>
          </select>
        </label>
        <label>City<input name="city" defaultValue={person?.city ?? ""} /></label>
        <label>Email (for gift links)<input name="email" type="email" defaultValue={person?.email ?? ""} /></label>
        <label>Budget from ($)<input name="budget_min" type="number" min="0" defaultValue={person?.budget_min ?? 25} /></label>
        <label>Budget up to ($)<input name="budget_max" type="number" min="5" defaultValue={person?.budget_max ?? 75} /></label>
      </div>
      <label>Likes (comma separated)<input name="likes" defaultValue={person?.likes.join(", ")} placeholder={INTERESTS.slice(0, 5).join(", ")} /></label>
      <label>Dislikes (comma separated)<input name="dislikes" defaultValue={person?.dislikes.join(", ")} /></label>
      <label>Notes<textarea name="notes" rows={2} defaultValue={person?.notes ?? ""} placeholder="Shoe size, favorite team, already has a Switch..." /></label>
      <p className="muted">Interests the picker knows: {INTERESTS.join(", ")}.</p>
      <button className="btn" type="submit">Save</button>
    </form>
  );
}
