import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import '../styles/app.css';

interface PixPaymentPopupProps {
  amount: number; // em centavos
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

  // Criar o pagamento ao montar
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
      } catch (err) {
        console.error('Exception creating payment:', err);
        setError('Erro inesperado. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [amount, description]);

  // Polling do status a cada 3 segundos
  useEffect(() => {
    if (!paymentId || status === 'APPROVED') return;

    const checkStatus = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('bravive-pix-status', {
          body: {},
          method: 'GET',
        });

        // Para GET com query params, precisamos fazer de outra forma
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
    <div className="pix-popup-overlay">
      <div className="pix-popup-container">
        <button className="pix-popup-close" onClick={onClose}>×</button>
        
        <div className="pix-popup-header">
          <img src="/images/pix-solo.svg" alt="PIX" className="pix-popup-logo" />
          <h2 className="pix-popup-title">Pagamento via PIX</h2>
        </div>

        <div className="pix-popup-amount">
          R$ {formatAmount(amount)}
        </div>

        {loading && (
          <div className="pix-popup-loading">
            <div className="pix-popup-spinner"></div>
            <p>Gerando código PIX...</p>
          </div>
        )}

        {error && (
          <div className="pix-popup-error">
            <p>{error}</p>
            <button className="pix-popup-retry" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && pixCode && (
          <>
            <div className="pix-popup-instructions">
              <p>Copie o código abaixo e cole no app do seu banco:</p>
            </div>

            <div className="pix-popup-code-container">
              <textarea
                className="pix-popup-code"
                value={pixCode}
                readOnly
                rows={3}
              />
              <button 
                className={`pix-popup-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Copiado!' : 'Copiar código'}
              </button>
            </div>

            <div className="pix-popup-status">
              <div className={`pix-popup-status-indicator ${status.toLowerCase()}`}></div>
              <span>
                {status === 'PENDING' && 'Aguardando pagamento...'}
                {status === 'APPROVED' && 'Pagamento confirmado!'}
                {status === 'REJECTED' && 'Pagamento rejeitado'}
                {status === 'CANCELED' && 'Pagamento cancelado'}
              </span>
            </div>

            <div className="pix-popup-footer">
              <p>O pagamento será confirmado automaticamente.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PixPaymentPopup;
