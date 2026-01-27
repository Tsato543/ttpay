import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Presell() {
  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();

  const goNext = () => setStep(2);

  const goApp = () => navigate("/app");

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        {step === 1 && (
          <>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
              Parabéns! Você concluiu todas as tarefas.
            </h1>
            <p style={{ marginTop: 10, marginBottom: 16, color: "#444", fontSize: 14, lineHeight: 1.4 }}>
              Falta só confirmar e liberar seu acesso.
            </p>

            <div style={{ background: "#fff6f7", border: "1px solid #ffd1da", padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fe2b54" }}>Atenção</div>
              <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
                Continue para liberar a próxima tela.
              </div>
            </div>

            <button
              onClick={goNext}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 999,
                border: 0,
                background: "#fe2b54",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Continuar
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Validando…
            </h2>
            <p style={{ marginTop: 8, marginBottom: 14, color: "#666", fontSize: 13 }}>
              Aguarde um momento. Você será redirecionado(a).
            </p>

            <LoaderBar />

            <button
              onClick={goApp}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 999,
                border: 0,
                background: "#111",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 14,
              }}
            >
              Ir agora
            </button>

            {/* auto redirect em 4s */}
            <AutoRedirect to="/app" ms={4000} />
          </>
        )}
      </div>
    </div>
  );
}

function LoaderBar() {
  return (
    <div style={{ width: "100%", height: 10, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        width: "100%",
        height: "100%",
        background: "#fe2b54",
        transformOrigin: "left",
        animation: "fill 4s linear forwards"
      }} />
      <style>{`
        @keyframes fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

function AutoRedirect({ to, ms }: { to: string; ms: number }) {
  const navigate = useNavigate();

  // useEffect inline simples (sem import extra)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  require("react").useEffect(() => {
    const t = setTimeout(() => navigate(to), ms);
    return () => clearTimeout(t);
  }, [navigate, to, ms]);

  return null;
}
