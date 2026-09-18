import { createFileRoute } from "@tanstack/react-router";
import { EditorialPage } from "@/components/editorial-page";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacy policy | Cauldron of Words" },
      { name: "description", content: "Privacy information for Cauldron of Words, including local storage, ranking scores, analytics, and advertising." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <EditorialPage
      eyebrow="Legal information"
      title="Privacy policy"
      description="This notice explains what Cauldron of Words stores, why it is used, and how third-party services may process information."
    >
      <p>Last updated: September 18, 2026.</p>
      <h2>Information you provide</h2>
      <p>When you create a player, the name you choose and your game result may be sent to the ranking service so the public leaderboard can work. Do not use your real name, email address, or other sensitive information as a player name.</p>
      <h2>Information stored in your browser</h2>
      <p>The site stores a temporary player session in local storage so you do not have to enter the same name on every visit. You can clear it through your browser settings. The game does not need access to your files, contacts, microphone, or camera.</p>
      <h2>Analytics</h2>
      <p>We use Microsoft Clarity to understand broad interaction patterns, such as which parts of the experience are useful and where the interface is difficult to use. Clarity may process technical information about the browser and session. We do not use it to collect the text of private documents.</p>
      <h2>Advertising and cookies</h2>
      <p>Google AdSense may show advertising on selected editorial pages. Google and its partners may use cookies or similar technologies for measurement and advertising, subject to the choices and notices presented in your region. Ads are not placed inside the typing round or over game controls.</p>
      <h2>Third-party services</h2>
      <p>The ranking uses a hosted database service. Those requests contain the player name and score needed for the ranking. We do not sell player data. If you have a privacy request, contact the site owner through the channel associated with the domain where you accessed this policy.</p>
      <h2>Changes</h2>
      <p>We may update this notice when the product or its services change. The date at the top identifies the current version.</p>
    </EditorialPage>
  );
}
