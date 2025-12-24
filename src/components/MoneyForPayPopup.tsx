import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from '@/lib/tiktokPixel';

interface MoneyForPayPopupProps {
  amount: number; // in cents
  productName: string;
  pageOrigin: string;
  onSuccess: () => void;
  onClose: () => void;
}

const MoneyForPayPopup = ({ amount, productName, pageOrigin, onSuccess, onClose }: MoneyForPayPopupProps) => {
  const [pixCode, setPixCode] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Track InitiateCheckout when popup opens
  useEffect(() => {
    trackInitiateCheckout(amount / 100, productName);
  }, [amount, productName]);

  // Create payment on mount
  const createPixPayment = useCallback(async () => {
    setLoading(true);
    setPixCode('');
    setCopied(false);
    setError(null);

    try {
      console.log('Creating MoneyForPay payment:', { amount, productName, pageOrigin });
      
      const { data, error: fnError } = await supabase.functions.invoke('moneyforpay-create', {
        body: { amount, productName, pageOrigin },
      });

      if (fnError) {
        console.error('Error creating payment:', fnError);
        setError('Não foi possível gerar o código PIX');
        toast({ title: 'Erro', description: 'Não foi possível gerar o código PIX', variant: 'destructive' });
        return;
      }

      if (data?.error) {
        console.error('API error:', data.error);
        setError(data.error);
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        return;
      }

      console.log('Payment created:', data);
      setPaymentId(data.idTransaction);
      setPixCode(data.paymentCode);
      
      // Track AddPaymentInfo when PIX code is generated
      trackAddPaymentInfo(amount / 100);
    } catch (err) {
      console.error('Exception creating payment:', err);
      setError('Erro ao conectar com o servidor');
      toast({ title: 'Erro', description: 'Erro ao conectar com o servidor', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [amount, productName, pageOrigin, toast]);

  useEffect(() => {
    createPixPayment();
  }, [createPixPayment]);

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      console.log('Checking payment status for:', paymentId);
      
      const { data, error: fnError } = await supabase.functions.invoke('moneyforpay-status', {
        body: { idTransaction: paymentId },
      });

      if (fnError) {
        console.error('Error checking status:', fnError);
        return;
      }

      console.log('Payment status:', data);

      if (data?.status === 'paid') {
        toast({ title: 'Pagamento confirmado!', description: 'Redirecionando...' });
        // Track Purchase
        trackPurchase(amount / 100, productName, paymentId);
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }, [paymentId, amount, productName, onSuccess, toast]);

  // Poll for status every 3 seconds
  useEffect(() => {
    if (!paymentId) return;

    const interval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(interval);
  }, [paymentId, checkPaymentStatus]);

  const handleCopyPixCode = useCallback(async () => {
    if (!pixCode) return;
    
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast({ title: 'Código copiado!', description: 'Cole no app do seu banco.' });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [pixCode, toast]);

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
              onClick={createPixPayment}
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
              onClick={handleCopyPixCode}
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
                backgroundColor: '#fbbf24',
                animation: 'pulse 1.5s infinite',
              }} />
              <span>Aguardando pagamento...</span>
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

export default MoneyForPayPopup;
