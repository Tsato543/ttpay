import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StepAge() {
  const navigate = useNavigate();
  const [age, setAge] = useState("");

  const canContinue = age.trim().length > 0;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Sua idade</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Informe sua idade para continuar.
      </p>

      <input
        value={age}
        onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
        placeholder="Ex: 21"
        inputMode="numeric"
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
        onClick={() => navigate("/stepname")}
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
