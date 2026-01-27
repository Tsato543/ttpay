import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StepName() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const canContinue = name.trim().length >= 2;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Seu nome</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Digite seu nome para continuar.
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Caio"
        style={{
          marginTop: 14,
          width: "100%",
          height: 48,
          borderRadius: 12,
          border: "1px solid #ddd",
          padding: "0 14px",
          fontSize: 16,
        }}
      />

      <button
        onClick={() => navigate("/loading")}
        disabled={!canContinue}
        style={{
          marginTop: 18,
          width: "100%",
          height: 48,
          borderRadius: 999,
          border: 0,
          cursor: canContinue ? "pointer" : "not-allowed",
          fontWeight: 700,
          opacity: canContinue ? 1 : 0.5,
        }}
      >
        Continuar
      </button>
    </div>
  );
}
