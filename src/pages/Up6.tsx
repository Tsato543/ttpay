import PageTransition from '@/components/PageTransition';
import '../styles/app.css';

const Up6 = () => {
  return (
    <PageTransition>
      <main className="upsell-page">
        <div className="title">Processando</div>

        <div className="upsell-card upsell-card-center upsell-card-success">
          <div className="success-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h1 className="success-heading">Conversão Realizada!</h1>

          <p className="success-message">
            Seu saque de R$ 29.989,50 está sendo processado.
          </p>
        </div>
      </main>
    </PageTransition>
  );
};

export default Up6;
