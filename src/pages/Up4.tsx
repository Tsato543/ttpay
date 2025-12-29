import { useEffect } from 'react';
import PageTransition from '@/components/PageTransition';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_ANTIGO = 2834.72;
const SALDO_NOVO = 4287.90;
const TAXA_UPGRADE = 14.99;
const TAXA_UPGRADE_CENTAVOS = 1499;
const PRODUCT_HASH = 'prod_701168e3024391a7';

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up4 = () => {
  useEffect(() => {
    trackViewContent('Upgrade Premium', TAXA_UPGRADE);
  }, []);

  return (
    <PageTransition>
      <main className="upsell-page upsell-page-with-footer">
        {/* Header */}
        <div className="upsell-header">
          <img src="/images/tiktok-logo.png" alt="TikTok" className="upsell-logo" />
        </div>

        {/* Status Badge */}
        <div className="badge-row">
          <div className="status-badge status-neutral">
            STATUS: UPGRADE DISPONÍVEL <span>✅</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="upsell-card">
          <h1 className="upsell-heading">
            Seu limite de recebimento foi expandido para R$ {formatBR(SALDO_NOVO)}
          </h1>

          <p className="upsell-text">
            Identificamos um histórico positivo no seu perfil. Por isso, sua conta está elegível para a categoria{' '}
            <span className="text-bold">PREMIUM VITALÍCIO</span>, permitindo o acesso imediato a valores acumulados superiores.
          </p>

          {/* Info Box */}
          <div className="info-box info-box-detailed">
            <div className="info-header">
              <span>ⓘ</span>
              <span className="info-header-text">RESUMO DA ATUALIZAÇÃO DE CONTA</span>
            </div>

            <p className="info-text">
              No perfil "Básico", sua solicitação atual seria de R$ {formatBR(SALDO_ANTIGO)}.
            </p>

            <p className="info-text">
              Com a validação Premium, o sistema recalcula o total, somando os bônus pendentes. O novo valor integral disponível passa a ser{' '}
              <span className="text-bold">R$ {formatBR(SALDO_NOVO)}</span>.
            </p>

            <p className="info-text">
              Para confirmar essa alteração de categoria e habilitar o recebimento do valor maior, é necessária apenas a validação de segurança.
            </p>
          </div>

          {/* Benefits List */}
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon">↑</div>
              <div>
                <span className="text-bold">Ajuste de Saldo: </span>
                <span>Valor atualizado de R$ {formatBR(SALDO_ANTIGO)} para R$ {formatBR(SALDO_NOVO)}.</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">⚡</div>
              <div>
                <span className="text-bold">Processamento Prioritário: </span>
                <span>Transferência imediata via sistema automático.</span>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">✓</div>
              <div>
                <span className="text-bold">Conta Verificada: </span>
                <span>Isenção de verificações futuras.</span>
              </div>
            </div>
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
            data-offer-hash="upsell_cabf994f36e93447"
            data-modal-title="Confirmar Upgrade!"
            data-copy-button-text="Copiar Código PIX"
            data-modal-bg="#ffffff"
            data-modal-title-color="#1f2937"
            data-modal-btn-color="#28a745"
            data-modal-btn-text-color="#ffffff"
          >
            Confirmar Upgrade e receber R$ 4.287,90
          </button>
          <p className="cta-success-note">Verificação única de R$ {formatBR(TAXA_UPGRADE)}</p>
        </div>
      </main>
    </PageTransition>
  );
};

export default Up4;
