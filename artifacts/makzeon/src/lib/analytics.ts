declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

function appendScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAnalytics() {
  const ga4Id = import.meta.env.VITE_GA4_ID;
  if (ga4Id) {
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`, "makzeon-ga4");
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("config", ga4Id, { anonymize_ip: true });
  }

  const linkedInPartnerId = import.meta.env.VITE_LINKEDIN_PARTNER_ID;
  if (linkedInPartnerId) {
    window._linkedin_partner_id = linkedInPartnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(linkedInPartnerId);
    appendScript("https://snap.licdn.com/li.lms-analytics/insight.min.js", "makzeon-linkedin-insight");
  }
}
