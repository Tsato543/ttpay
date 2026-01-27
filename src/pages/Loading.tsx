import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Loading() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      navigate("/home");
    }, 4000);

    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Aguarde um momento…</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Você está sendo redirecionado(a) para a etapa final do processo.
      </p>

      <div
        style={{
          marginTop: 18,
          height: 10,
          width: "100%",
          borderRadius: 999,
          background: "#eee",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            transformOrigin: "left",
            animation: "bar 4s linear forwards",
            background: "#fe2b54",
          }}
        />
      </div>

      <style>{`
        @keyframes bar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
