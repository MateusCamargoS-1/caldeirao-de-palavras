import { createFileRoute } from "@tanstack/react-router";
import { EditorialPage } from "@/components/editorial-page";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "About | Cauldron of Words" },
      { name: "description", content: "Learn why Cauldron of Words exists and how it turns focused typing practice into a small interactive story." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <EditorialPage
      eyebrow="About the project"
      title="A quiet typing practice built around stories."
      description="Cauldron of Words is an original browser experience for people who want to build typing focus without turning practice into a race against a noisy dashboard."
      showAd
    >
      <p>We designed the experience around a simple idea: typing becomes easier to repeat when the exercise has a sense of place. Instead of isolated word lists, each round gives you a short fictional passage. Every correct character releases a grain into the cauldron, so progress is visible while you work.</p>
      <h2>What we value</h2>
      <p>The project is built for the open web. It does not require an account to play, it does not sell writing, and it does not ask for access to your keyboard outside the active game. A local player name is used only to show a score in the public ranking experience.</p>
      <p>Our stories are written for this project and edited to make the exercise readable. They use ordinary punctuation, accents, paragraph breaks, and sentence rhythm so that practice resembles real writing rather than a stream of random characters.</p>
      <h2>How the experience works</h2>
      <p>Choose a player name, read the passage, and type what is shown. Correct characters add grains; mistakes reduce the remaining time. The visual container is a progress metaphor, not a replacement for the passage: the words and instructions remain the center of the experience.</p>
      <p>Cauldron of Words is an independent project. The site may use privacy-friendly analytics and clearly labeled advertising on editorial pages. Ads are not displayed inside the typing round or over the controls needed to play.</p>
    </EditorialPage>
  );
}
