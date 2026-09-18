import { createFileRoute, Link } from "@tanstack/react-router";
import { EditorialPage } from "@/components/editorial-page";

export const Route = createFileRoute("/como-jogar")({
  head: () => ({
    meta: [
      { title: "How to play | Cauldron of Words" },
      { name: "description", content: "A complete guide to starting a Cauldron of Words round, handling accents, and reading your result." },
    ],
  }),
  component: HowToPlayPage,
});

function HowToPlayPage() {
  return (
    <EditorialPage
      eyebrow="Player guide"
      title="How to play Cauldron of Words"
      description="The game is a focused typing exercise: read a short story, reproduce it exactly, and watch a physical progress metaphor respond to every character."
      showAd
    >
      <h2>Before you start</h2>
      <p>Choose a short player name and select the language that matches the keyboard you are using. The first screen explains the goal and shows the current public ranking. You can begin with the mouse or press Enter when the start button is focused.</p>
      <h2>During a round</h2>
      <ol>
        <li>Read the highlighted passage from left to right.</li>
        <li>Type every character, including spaces, punctuation, paragraph breaks, and accents.</li>
        <li>Watch the timer and the word counter, but keep your attention on the passage.</li>
        <li>Finish the passage before the timer reaches zero.</li>
      </ol>
      <p>Each correct character releases a grain into the container. A mistyped character is marked in the passage and costs one second. Completing a paragraph adds a small time bonus, rewarding steady reading rather than frantic key presses.</p>
      <h2>Accents and keyboard layouts</h2>
      <p>On Portuguese keyboard layouts, an accent can arrive as a dead key followed by a letter. The game recognizes the composed result and keeps the exercise fair. If the browser or keyboard layout is producing unexpected characters, switch to the matching language button before beginning a new round.</p>
      <h2>Results and privacy</h2>
      <p>When the round ends, the result shows completed words and accuracy. A score can be associated with the player name you entered for the ranking. Read our <Link to="/privacidade">privacy notice</Link> for details about local storage, ranking data, and analytics.</p>
    </EditorialPage>
  );
}
