"use client";
import { useState } from "react";

export default function PasswordField({ name = "password", label = "Password", autoComplete = "current-password", required = true, hint }) {
  const [show, setShow] = useState(false);
  return (
    <label className="lg-field">
      {label}
      <span className="lg-pw">
        <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required={required} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
      </span>
      {hint && <span className="small">{hint}</span>}
    </label>
  );
}
