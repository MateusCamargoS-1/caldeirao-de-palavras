import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AdSlot } from "./ad-slot";

type EditorialPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  showAd?: boolean;
};

export function EditorialPage({
  eyebrow,
  title,
  description,
  children,
  showAd = false,
}: EditorialPageProps) {
  return (
    <div className="editorial-shell">
      <header className="editorial-nav">
        <Link to="/" className="editorial-brand">Cauldron of Words</Link>
        <nav aria-label="Site navigation" className="editorial-links">
          <Link to="/sobre">About</Link>
          <Link to="/como-jogar">How to play</Link>
          <Link to="/recursos/digitacao">Typing guide</Link>
        </nav>
      </header>
      <main className="editorial-content">
        <p className="editorial-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="editorial-lead">{description}</p>
        <div className="editorial-body">{children}</div>
        {showAd && (
          <div className="editorial-ad-wrap">
            <p className="editorial-ad-label">Publicidade</p>
            <AdSlot slot="7517008804" />
          </div>
        )}
      </main>
      <footer className="editorial-footer">
        <span>© {new Date().getFullYear()} Cauldron of Words</span>
        <div>
          <Link to="/privacidade">Privacy</Link>
          <Link to="/termos">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
