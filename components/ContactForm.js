"use client";

import { useEffect, useState } from "react";

const SERVICES = ["SEO audit", "Detailed audit", "Page speed optimization"];

export function ContactForm() {
  const [service, setService] = useState(SERVICES[0]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("service");
    if (requested && SERVICES.includes(requested)) setService(requested);
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setStatus("Sending");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          email: fields.get("email"),
          site: fields.get("site"),
          service,
          message: fields.get("message"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the request.");
      form.reset();
      setStatus("Sent. We will reply with the price and the scope.");
    } catch (err) {
      setStatus("");
      setError(err.message);
    }
  }

  return (
    <form className="card contact-form" id="contact" onSubmit={submit}>
      <h2>Contact us</h2>
      <p className="muted">Tell us the site and the engagement. The reply includes the price.</p>
      <div className="row">
        <div className="field">
          <label htmlFor="contact-name">Name</label>
          <input id="contact-name" name="name" type="text" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" required maxLength={120} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-site">Website</label>
        <input id="contact-site" name="site" type="url" required placeholder="https://example.com" />
      </div>
      <div className="field">
        <label htmlFor="contact-service">Engagement</label>
        <select id="contact-service" value={service} onChange={(event) => setService(event.target.value)}>
          {SERVICES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="contact-message">What should the work cover?</label>
        <textarea id="contact-message" name="message" required maxLength={2000} />
      </div>
      {error ? <div className="banner">{error}</div> : null}
      <button className="btn" type="submit" disabled={status === "Sending"}>{status === "Sending" ? "Sending" : "Request a quote"}</button>
      {status && status !== "Sending" ? <p>{status}</p> : null}
    </form>
  );
}
