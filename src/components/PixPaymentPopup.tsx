import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from '@/lib/tiktokPixel';

interface PixPaymentPopupProps {
  amount: number;
  description?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const PixPaymentPopup = ({ amount, description, onSuccess, onClose }: PixPaymentPopupProps) => {
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>('PENDING');

  // Track InitiateCheckout when popup opens
  useEffect(() => {
    trackInitiateCheckout(amount / 100, description || 'Pagamento PIX');
  }, [amount, description]);

  useEffect(() => {
    const createPayment = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fnError } = await supabase.functions.invoke('bravive-pix-create', {
          body: { amount, description },
        });

        if (fnError) {
          console.error('Error creating payment:', fnError);
          setError('Erro ao criar pagamento. Tente novamente.');
          return;
        }

        if (data.error) {
          console.error('API error:', data.error);
          setError(data.error);
          return;
        }

        console.log('Payment created:', data);
        setPaymentId(data.id);
        setPixCode(data.pix_code);
        setStatus(data.status || 'PENDING');
        
        // Track AddPaymentInfo when PIX code is generated
        trackAddPaymentInfo(amount / 100);
      } catch (err) {
        console.error('Exception creating payment:', err);
        setError('Erro inesperado. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [amount, description]);

  useEffect(() => {
    if (!paymentId || status === 'APPROVED') return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bravive-pix-status?id=${paymentId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );

        const statusData = await response.json();
        console.log('Payment status:', statusData);

        if (statusData.status === 'APPROVED') {
          setStatus('APPROVED');
          // Track Purchase - MOST IMPORTANT EVENT
          trackPurchase(amount / 100, description || 'Pagamento PIX', paymentId);
          onSuccess();
        } else if (statusData.status) {
          setStatus(statusData.status);
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [paymentId, status, onSuccess]);

  const handleCopy = useCallback(() => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pixCode]);

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '340px',
        padding: '24px',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#999',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/images/pix-solo.svg" alt="PIX" style={{ width: '32px', marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fe2b54' }}>
            R$ {formatAmount(amount)}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #f1f1f1',
              borderTop: '3px solid #fe2b54',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Gerando código PIX...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#fe2b54', fontSize: '14px', margin: '0 0 12px' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#fe2b54',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '99px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && pixCode && (
          <>
            <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', margin: '0 0 12px' }}>
              Copie o código e cole no app do seu banco
            </p>

            <textarea
              readOnly
              value={pixCode}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'none',
                backgroundColor: '#f9f9f9',
                color: '#333',
                boxSizing: 'border-box',
              }}
              rows={3}
            />

            <button 
              onClick={handleCopy}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: copied ? '#22c55e' : '#fe2b54',
                color: '#fff',
                border: 'none',
                borderRadius: '99px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {copied ? '✓ Copiado!' : 'Copiar código'}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px',
              fontSize: '12px',
              color: '#888',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: status === 'APPROVED' ? '#22c55e' : '#fbbf24',
                animation: status === 'PENDING' ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span>
                {status === 'PENDING' && 'Aguardando pagamento...'}
                {status === 'APPROVED' && 'Pagamento confirmado!'}
                {status === 'REJECTED' && 'Pagamento rejeitado'}
                {status === 'CANCELED' && 'Pagamento cancelado'}
              </span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PixPaymentPopup;
