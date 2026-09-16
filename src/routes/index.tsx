import { createFileRoute } from "@tanstack/react-router";
import { TypingCauldron } from "@/game/TypingCauldron";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TypingCauldron />;
}
