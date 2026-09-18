import { createFileRoute } from "@tanstack/react-router";
import { EditorialPage } from "@/components/editorial-page";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Terms of use | Cauldron of Words" },
      { name: "description", content: "Terms for using the Cauldron of Words typing practice and public ranking." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <EditorialPage
      eyebrow="Legal information"
      title="Terms of use"
      description="These simple terms keep Cauldron of Words useful, safe, and fair for everyone who practices here."
    >
      <p>Last updated: September 18, 2026.</p>
      <h2>Use of the service</h2>
      <p>Cauldron of Words is a browser-based typing practice and storytelling experience. You may use it for personal, educational, and non-commercial practice. You are responsible for choosing an appropriate player name and for using the service in compliance with applicable law.</p>
      <h2>Public ranking</h2>
      <p>Scores and player names entered for the ranking may be visible to other visitors. Do not submit personal information, abusive language, impersonation, or content that violates another person’s rights. We may remove scores that appear automated, misleading, or harmful.</p>
      <h2>Availability</h2>
      <p>We work to keep the site available, but the service may change or be temporarily unavailable for maintenance. Scores, settings, and generated game state are not guaranteed to be permanent.</p>
      <h2>Content and intellectual property</h2>
      <p>The original interface, stories, illustrations, and code presented by the site belong to their respective rights holders. You may not copy, redistribute, or use the site to interfere with other visitors’ access.</p>
      <h2>Third-party services</h2>
      <p>The service may use hosted ranking, analytics, advertising, and infrastructure providers. Their own terms and privacy notices may also apply to the parts of the experience they operate.</p>
      <h2>Contact and updates</h2>
      <p>These terms may be updated as the project evolves. Continued use after an update means you accept the revised terms.</p>
    </EditorialPage>
  );
}
