import { useEffect } from 'react';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_TENF = 19.90;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up1 = () => {
  useEffect(() => {
    trackViewContent('Ativação TENF', TAXA_TENF);
  }, []);

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
            className="paradise-upsell-btn"
            style={{
              backgroundColor: '#fe2b54',
              color: '#ffffff',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
            }}
            data-offer-hash="upsell_641f662b70e65456"
            data-modal-title="Ativação TENF"
            data-copy-button-text="Copiar Código PIX"
            data-modal-bg="#ffffff"
            data-modal-title-color="#1f2937"
            data-modal-btn-color="#28a745"
            data-modal-btn-text-color="#ffffff"
          >
            Ativar TENF Obrigatório
          </button>

          <p className="cta-footnote">
            A ativação é obrigatória para saques acima de R$ 1.500
          </p>
        </div>
      </main>
    </PageTransition>
  );
};

export default Up1;
