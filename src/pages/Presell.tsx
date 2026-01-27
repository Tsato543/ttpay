import { useNavigate } from "react-router-dom";

export default function Presell() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Parabéns!</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Você concluiu todas as etapas disponíveis no momento.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      >
        <strong>Restam 19 vagas disponíveis</strong>
        <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
          Clique em continuar para avançar.
        </p>
      </div>

      <button
        onClick={() => navigate("/stepage")}
        style={{
          marginTop: 18,
          width: "100%",
          height: 48,
          borderRadius: 999,
          border: 0,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Continuar
      </button>
    </div>
  );
}
