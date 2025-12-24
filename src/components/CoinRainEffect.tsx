import { useEffect, useState, useRef, forwardRef } from 'react';

interface Coin {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotationSpeed: number;
}

const CoinRainEffect = forwardRef<HTMLDivElement>((_, ref) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create coins
    const newCoins: Coin[] = [];
    for (let i = 0; i < 50; i++) {
      newCoins.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 0.8 + Math.random() * 0.6,
        size: 30 + Math.random() * 30,
        rotationSpeed: 0.3 + Math.random() * 0.4,
      });
    }
    setCoins(newCoins);

    // Play coin sound
    audioRef.current = new Audio('/sounds/coin-sound.mp3');
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(console.error);

    // Hide effect after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div ref={ref} className="coin-rain-container">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin-3d"
          style={{
            left: `${coin.left}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
            width: `${coin.size}px`,
            height: `${coin.size}px`,
          }}
        >
          <div 
            className="coin-inner"
            style={{
              animationDuration: `${coin.rotationSpeed}s`,
            }}
          >
            <div className="coin-front">
              <span className="coin-symbol">$</span>
            </div>
            <div className="coin-back">
              <span className="coin-symbol">★</span>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        .coin-rain-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
          perspective: 1000px;
        }

        .coin-3d {
          position: absolute;
          top: -80px;
          animation: coinFall ease-in forwards;
          transform-style: preserve-3d;
        }

        .coin-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: coinSpin linear infinite;
        }

        .coin-front,
        .coin-back {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          box-shadow: 
            0 0 10px rgba(255, 215, 0, 0.8),
            inset 0 0 20px rgba(255, 255, 255, 0.4),
            0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .coin-front {
          background: linear-gradient(145deg, #ffd700, #ffb700, #ffd700);
          border: 3px solid #daa520;
        }

        .coin-back {
          background: linear-gradient(145deg, #ffb700, #ffd700, #ffb700);
          border: 3px solid #daa520;
          transform: rotateY(180deg);
        }

        .coin-symbol {
          font-size: 50%;
          font-weight: bold;
          color: #8b6914;
          text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
        }

        @keyframes coinFall {
          0% {
            transform: translateY(0) rotateX(0deg) rotateZ(0deg);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotateX(720deg) rotateZ(360deg);
            opacity: 0;
          }
        }

        @keyframes coinSpin {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
});

CoinRainEffect.displayName = 'CoinRainEffect';

export default CoinRainEffect;
