import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from '@/lib/tiktokPixel';

interface ParadisePixPopupProps {
  amount: number; // in centavos
  description?: string;
  productHash: string;
  onSuccess: () => void;
  onClose: () => void;
}

const ParadisePixPopup = ({ amount, description, productHash, onSuccess, onClose }: ParadisePixPopupProps) => {
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>('PENDING');
  const [hasCreatedPayment, setHasCreatedPayment] = useState(false);

  useEffect(() => {
    trackInitiateCheckout(amount / 100, description || 'Pagamento PIX');
  }, [amount, description]);

  useEffect(() => {
    if (hasCreatedPayment) return;
    
    const createPayment = async () => {
      try {
        setHasCreatedPayment(true);
        setLoading(true);
        setError(null);

        console.log("Creating Paradise Pags payment:", { amount, description, productHash });

        const { data, error: fnError } = await supabase.functions.invoke('paradise-pix-create', {
          body: { 
            amount, 
            description,
            productHash,
            customer: {
              name: "Cliente",
              email: "cliente@upsell.com",
              document: "00000000000",
              phone: "00000000000"
            }
          }
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
        setPixCode(data.qr_code);
        setStatus('PENDING');
        
        trackAddPaymentInfo(amount / 100);
      } catch (err) {
        console.error('Exception creating payment:', err);
        setError('Erro inesperado. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [hasCreatedPayment, amount, description, productHash]);

  useEffect(() => {
    if (!paymentId || status === 'APPROVED') return;

    console.log('Starting payment status polling for:', paymentId);

    const checkStatus = async () => {
      try {
        console.log('Checking payment status...');
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paradise-pix-status?id=${paymentId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );

        const statusData = await response.json();
        console.log('Payment status response:', statusData);

        if (statusData.status === 'APPROVED') {
          setStatus('APPROVED');
          console.log('Payment APPROVED! Tracking purchase and calling onSuccess');
          trackPurchase(amount / 100, description || 'Pagamento PIX', paymentId);
          setTimeout(() => {
            onSuccess();
          }, 500);
        } else if (statusData.status) {
          setStatus(statusData.status);
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    checkStatus();
    
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [paymentId, status, onSuccess, amount, description]);

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
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '380px',
        padding: '28px',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f1f1',
            border: 'none',
            fontSize: '18px',
            color: '#666',
            cursor: 'pointer',
            lineHeight: 1,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/images/pix-solo.svg" alt="PIX" style={{ width: '40px', marginBottom: '12px' }} />
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a' }}>
            R$ {formatAmount(amount)}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            {description}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e5e5e5',
              borderTop: '3px solid #00b894',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Gerando código PIX...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#e74c3c', fontSize: '14px', margin: '0 0 16px' }}>{error}</p>
            <button 
              onClick={() => {
                setHasCreatedPayment(false);
                setError(null);
              }}
              style={{
                background: '#00b894',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && pixCode && (
          <>
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ 
                fontSize: '12px', 
                color: '#666', 
                textAlign: 'center', 
                margin: '0 0 12px',
                fontWeight: 500 
              }}>
                PIX Copia e Cola
              </p>

              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'stretch',
              }}>
                <input
                  readOnly
                  value={pixCode}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    backgroundColor: '#fff',
                    color: '#333',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                />
                <button 
                  onClick={handleCopy}
                  style={{
                    padding: '14px 20px',
                    backgroundColor: copied ? '#00b894' : '#2d3436',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copied ? '✓' : '📋'} {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              backgroundColor: status === 'APPROVED' ? '#d4edda' : '#fff3cd',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: status === 'APPROVED' ? '#00b894' : '#f39c12',
                animation: status === 'PENDING' ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ color: status === 'APPROVED' ? '#155724' : '#856404' }}>
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

export default ParadisePixPopup;
