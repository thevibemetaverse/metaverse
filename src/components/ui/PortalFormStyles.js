// PortalFormStyles.js - Styles for the Portal Form component

/**
 * Creates and injects the portal form styles into the document head
 * @returns {HTMLStyleElement} The created style element
 */
export function injectPortalFormStyles() {
  // Check if styles are already injected
  const existingStyle = document.getElementById('portal-form-styles');
  if (existingStyle) {
    return existingStyle;
  }

  const style = document.createElement('style');
  style.id = 'portal-form-styles';
  style.textContent = `
    .portal-form-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(16, 24, 48, 0.95);
      color: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 0 30px rgba(74, 144, 226, 0.6);
      z-index: 1000;
      width: 400px;
      max-width: 90vw;
      font-family: 'system-ui', sans-serif;
    }
    
    /* Mobile responsive adjustments */
    @media (max-width: 600px) {
      .portal-form-container {
        width: 90%;
        padding: 15px;
        font-size: 14px;
      }
      
      .portal-form-container h2 {
        font-size: 20px;
      }
      
      .portal-form-container input,
      .portal-form-container textarea {
        padding: 8px;
        font-size: 14px;
      }
      
      .portal-form-container .buttons {
        flex-direction: column;
        gap: 10px;
      }
      
      .portal-form-container button {
        width: 100%;
        padding: 12px;
      }

      .success-container {
        flex-direction: column;
        gap: 10px;
      }
      
      .success-icon {
        height: 60px;
        width: 60px;
        font-size: 36px;
      }
      
      .success-text h3 {
        font-size: 18px;
      }
      
      .success-text p {
        font-size: 14px;
      }
    }
    
    @keyframes portal-form-appear {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes portal-form-disappear {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
    }
    
    @keyframes portal-glow {
      0% { text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2; }
      100% { text-shadow: 0 0 15px #4a90e2, 0 0 30px #4a90e2; }
    }
    
    .portal-form-container h2 {
      text-align: center;
      margin-top: 0;
      margin-bottom: 20px;
      color: #ffffff;
      font-size: 24px;
      text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2;
      animation: portal-glow 2s infinite alternate;
    }
    
    .portal-form-container input,
    .portal-form-container textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      border-radius: 5px;
      border: 1px solid rgba(74, 144, 226, 0.5);
      background-color: rgba(0, 20, 40, 0.7);
      color: white;
      font-size: 16px;
    }
    
    .portal-form-container label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #4a90e2;
    }
    
    .portal-form-container .checkbox-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .portal-form-container .checkbox-container input {
      width: auto;
      margin-right: 10px;
      margin-top: 3px;
    }
    
    .portal-form-container .buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .portal-form-container button {
      padding: 10px 20px;
      border-radius: 5px;
      border: none;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .portal-form-container button[type="submit"] {
      background-color: #4a90e2;
      color: white;
    }
    
    .portal-form-container button[type="submit"]:hover {
      background-color: #3a80d2;
      box-shadow: 0 0 15px rgba(74, 144, 226, 0.8);
    }
    
    .portal-form-container button[type="button"] {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .portal-form-container button[type="button"]:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
    
    .portal-success-message {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 128, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      z-index: 10000;
      text-align: center;
      animation: portal-success-appear 0.5s ease-out forwards, 
                 portal-success-glow 2s infinite alternate;
      max-width: 80%;
    }

    /* Mobile responsive adjustment for success message */
    @media (max-width: 600px) {
      .portal-success-message {
        padding: 15px;
        max-width: 90%;
      }
    }
    
    @keyframes portal-success-appear {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes portal-success-glow {
      0% {
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      }
      100% {
        box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
      }
    }
    
    .success-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
    
    .success-icon {
      font-size: 48px;
      height: 80px;
      width: 80px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00;
      animation: success-icon-pulse 1.5s infinite alternate;
    }
    
    @keyframes success-icon-pulse {
      0% {
        transform: scale(1);
        text-shadow: 0 0 10px #00ff00;
      }
      100% {
        transform: scale(1.1);
        text-shadow: 0 0 20px #00ff00;
      }
    }
    
    .success-text h3 {
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: bold;
    }
    
    .success-text p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }
    
    @keyframes portal-success-disappear {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}

// Add a function to create confetti effect
export function createConfettiEffect() {
  const confettiCount = 200;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  
  const colors = ['#4a90e2', '#43e97b', '#f9ed32', '#f2709c', '#a177ff'];
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    confetti.style.position = 'absolute';
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = `${Math.random() * 5 + 5}px`;
    confetti.style.backgroundColor = color;
    confetti.style.borderRadius = '50%';
    confetti.style.opacity = Math.random() + 0.5;
    confetti.style.top = `-10px`;
    confetti.style.left = `${Math.random() * window.innerWidth}px`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.zIndex = '10000';
    
    const animationDuration = Math.random() * 3 + 2;
    confetti.style.animation = `fall ${animationDuration}s linear forwards`;
    
    // Create a style for this particular confetti's animation
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes fall {
        0% { 
          transform: translate3d(0, 0, 0) rotate(0deg); 
          opacity: ${confetti.style.opacity};
        }
        100% { 
          transform: translate3d(${(Math.random() - 0.5) * 400}px, ${window.innerHeight + 10}px, 0) rotate(${Math.random() * 720}deg); 
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleEl);
    
    container.appendChild(confetti);
    
    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove();
      styleEl.remove();
      
      // Remove container when last confetti is removed
      if (i === confettiCount - 1) {
        setTimeout(() => container.remove(), animationDuration * 1000);
      }
    }, animationDuration * 1000);
  }
} 