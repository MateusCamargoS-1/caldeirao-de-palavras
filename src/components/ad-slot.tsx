import { useEffect } from "react";

declare global { interface Window { adsbygoogle?: unknown[] } }

/** Responsive AdSense slot. It stays visually quiet until a publisher id is configured. */
export function AdSlot({ slot, format = "auto", label = "Publicidade" }: { slot: string; format?: string; label?: string }) {
  const client = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined) || "ca-pub-5115390230838752";
  useEffect(() => {
    if (!client || document.querySelector("script[data-adsense-loader]")) return;
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.adsenseLoader = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    document.head.appendChild(script);
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  }, [client]);
  return <aside className="ad-slot" aria-label={label} data-ad-slot={slot}>
    {client ? <ins className="adsbygoogle" style={{ display: "block", minHeight: 90 }} data-ad-client={client} data-ad-slot={slot} data-ad-format={format} data-full-width-responsive="true" /> : <span>{label}</span>}
  </aside>;
}
