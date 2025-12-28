import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParadisePixPopup from '@/components/ParadisePixPopup';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import { useCustomerData } from '@/hooks/useCustomerData';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_NFS = 9.90;
const TAXA_NFS_CENTAVOS = 990;
const PRODUCT_HASH = 'prod_0a240a2e87de20da';

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up2 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);
  const { customer } = useCustomerData();

  useEffect(() => {
    trackViewContent('Emissão NFS', TAXA_NFS);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up3');
  };

  return (
    <PageTransition>
      <main className="upsell-page">
        <div className="title">Emissão NFS</div>

        <div className="upsell-card">
          <h1 className="upsell-heading">
            Emissão NFS obrigatória para liberar saldos acima de R$ 2.000
          </h1>

          <p className="upsell-text">
            A emissão da NFS é um requisito obrigatório para liberar seu saque de{' '}
            <span className="highlight-value">R$ {formatBR(SALDO_FINAL)}</span>.
          </p>

          <div className="info-box">
            <p className="info-text">
              Sem esse registro fiscal, o valor não é autorizado pelo sistema e permanece retido até a regularização.
            </p>
          </div>

          <h2 className="upsell-subtitle">A NFS é necessária para:</h2>

          <ul className="upsell-list">
            {[
              'Comprovar o valor recebido',
              'Autorizar liberações acima do limite padrão',
              'Evitar retenção automática',
              'Garantir a liberação integral via Pix',
            ].map((item, idx) => (
              <li key={idx} className="upsell-list-item">
                <span className="list-bullet" />
                {item}
              </li>
            ))}
          </ul>

          <div className="info-box">
            <p className="info-text">
              Sem a NFS, o sistema não libera o saque.
            </p>
          </div>

          <div className="price-row">
            <span className="price-label">Valor da emissão da NFS</span>
            <span className="price-value">R$ {formatBR(TAXA_NFS)}</span>
          </div>

          <button
            onClick={() => setShowPixPopup(true)}
            className="cta-button cta-primary"
          >
            Emitir NFS obrigatória
          </button>

          <p className="cta-footnote">
            A emissão é obrigatória para saldos acima de R$ 2.000
          </p>
        </div>

        {showPixPopup && (
          <ParadisePixPopup
            amount={TAXA_NFS_CENTAVOS}
            description="Emissão NFS obrigatória"
            productHash={PRODUCT_HASH}
            customer={customer}
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowPixPopup(false)}
          />
        )}
      </main>
    </PageTransition>
  );
};

export default Up2;
