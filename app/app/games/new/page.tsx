import { redirect } from "next/navigation";

// The Arcade is the game picker now; inside the poker world the game is
// already decided, so old links here go back to the arcade.
export default function NewGameNightPage() {
  redirect("/app/arcade");
}
