import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
export function OwnerGate({ children }) {
  const [status, setStatus] = useState("checking"),
    location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/owner/session", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.authenticated) setStatus("owner");
        else
          navigate(
            "/login?next=" +
              encodeURIComponent(location.pathname + location.search),
            { replace: true },
          );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("unavailable");
      });
    return () => controller.abort();
  }, [location.pathname, location.search, navigate]);
  return status === "owner" ? (
    children
  ) : (
    <main className="owner-login">
      <span className="eyebrow">PRIVATE WORKSPACE</span>
      <h1>
        {status === "checking"
          ? "Checking access…"
          : "Owner access unavailable."}
      </h1>
      {status === "unavailable" && (
        <p>
          The owner authentication service must be running to open this
          workspace.
        </p>
      )}
    </main>
  );
}
export function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    navigate = useNavigate(),
    location = useLocation();
  const requested = new URLSearchParams(location.search).get("next");
  const next =
    requested && /^\/(?![\/\\])/.test(requested) ? requested : "/edit";
  return (
    <main className="owner-login">
      <a className="logo" href="/">
        Desartly<span>®</span>
      </a>
      <span className="eyebrow">OWNER ACCESS</span>
      <h1>
        A private space
        <br />
        for the work in progress.
      </h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const password = new FormData(e.currentTarget).get("password");
            const response = await fetch("/api/owner/login", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) throw Error(data.error || "Unable to sign in.");
            window.location.assign(next);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="owner-password">Owner password</label>
        <input
          id="owner-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button className="button dark" disabled={busy}>
          {busy ? "Signing in…" : "Enter workspace"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      <a className="owner-back" href="/">
        Return to the portfolio
      </a>
    </main>
  );
}
