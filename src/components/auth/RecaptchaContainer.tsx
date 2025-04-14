import React, { useEffect, useState, useRef } from 'react';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../../utils/firebase-config';
import { useAuth } from '../../features/auth/hooks/useAuth';

// Define the window interface extension
declare global {
  interface Window {
    recaptchaVerifier: any;
    recaptchaWidgetId: number | null;
    // grecaptcha is already declared in recaptchaUtils.ts
  }
}

interface RecaptchaContainerProps {
  onVerified?: (verifier: RecaptchaVerifier) => void;
  containerId?: string;
}

// Add this variable to track if we've initialized reCAPTCHA to prevent duplicates
let isRecaptchaInitialized = false;

// Add this function to safely check if grecaptcha is ready
function isGrecaptchaReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.grecaptcha !== undefined &&
    typeof window.grecaptcha.ready === 'function'
  );
}

// Add global style to prevent duplicate reCAPTCHA containers
function addGlobalReCaptchaStyle() {
  const styleId = 'global-recaptcha-style';
  
  // Only add once
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    
    // CSS to hide duplicate reCAPTCHA containers
    styleEl.textContent = `
      /* Ẩn các reCAPTCHA container trùng lặp bên ngoài container chính */
      body > div.grecaptcha-badge,
      body > div > div > div.grecaptcha-badge {
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Ẩn tất cả các thành phần reCAPTCHA khi đã đăng nhập */
      body.user-logged-in .grecaptcha-badge,
      body.user-logged-in .g-recaptcha,
      body.user-logged-in iframe[src*="recaptcha"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Ẩn các iframe không cần thiết */
      body > iframe[src*="recaptcha"]:not([id*="recaptcha"]) {
        position: absolute !important;
        left: -10000px !important;
      }
      
      /* Style cho container chính của reCAPTCHA để hiển thị đúng */
      #inline-recaptcha-container,
      #recaptcha-container {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 75px !important;
        overflow: visible !important;
      }
      
      /* Đảm bảo iframe bên trong container được hiển thị */
      #inline-recaptcha-container iframe[src*="recaptcha"],
      #recaptcha-container iframe[src*="recaptcha"] {
        display: block !important;
        margin: 0 auto !important;
        visibility: visible !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Đảm bảo g-recaptcha được hiển thị đúng */
      #inline-recaptcha-container .g-recaptcha,
      #recaptcha-container .g-recaptcha {
        display: flex !important;
        justify-content: center !important;
        width: 100% !important;
        height: auto !important;
        z-index: 1000 !important;
        transform: scale(0.95);
        transform-origin: center;
      }
      
      /* Fix lỗi che khuất content của reCAPTCHA */
      .rc-anchor-normal {
        visibility: visible !important;
        position: relative !important;
        display: block !important;
      }
    `;
    
    document.head.appendChild(styleEl);
  }
}

const RecaptchaContainer: React.FC<RecaptchaContainerProps> = ({ 
  onVerified,
  containerId = 'recaptcha-container'
}) => {
  const [message, setMessage] = useState<{text: string, type: 'info' | 'success' | 'error'}>({
    text: 'Vui lòng xác thực bảo mật để tiếp tục',
    type: 'info'
  });
  const [isVerified, setIsVerified] = useState(false);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const { user } = useAuth();

  // Complete cleanup function to remove all reCAPTCHA artifacts
  const cleanupAllRecaptcha = () => {
    try {
      // For development environments, just hide instead of removing elements
      const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
                            
      // If in development mode and verification has occurred, only do minimal cleanup
      if (isDevelopment && isVerified) {
        console.log('Skipping aggressive cleanup in development because verification already occurred');
        
        // Just hide extra elements but don't destroy
        document.querySelectorAll('.grecaptcha-badge').forEach(el => {
          try {
            if (el.parentNode && !(el as Element).closest(`#${containerId}`)) {
              (el as HTMLElement).style.visibility = 'hidden';
            }
          } catch (error) {
            console.log('Error hiding badge element');
          }
        });
        
        // Don't clear the verifiers
        return;
      }
      
      // Force cleanup all reCAPTCHA instances - only if fully loaded
      if (isGrecaptchaReady()) {
        // Check if any active reCAPTCHA clients exist before resetting
        try {
          window.grecaptcha.reset();
        } catch (resetError) {
          console.log('No active reCAPTCHA clients to reset, continuing cleanup');
        }
      }
      
      // Clear our specific verifier if it exists
      if (verifierRef.current && typeof verifierRef.current.clear === 'function') {
        try {
          verifierRef.current.clear();
        } catch (verifierError) {
          console.log('Failed to clear verifier reference, continuing cleanup');
        }
        verifierRef.current = null;
      }
      
      // Also clear global verifier
      if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
        try {
          window.recaptchaVerifier.clear();
        } catch (globalVerifierError) {
          console.log('Failed to clear global verifier, continuing cleanup');
        }
        window.recaptchaVerifier = null;
      }

      // Reset the widget ID
      window.recaptchaWidgetId = null;
      
      // Remove all reCAPTCHA scripts to prevent conflicts
      document.querySelectorAll('script[src*="recaptcha"]').forEach(script => {
        try {
          script.remove();
        } catch (error) {
          console.log('Failed to remove reCAPTCHA script');
        }
      });

      // Target specific cleanup for all reCAPTCHA elements
      const elementsToRemove = [
        '.grecaptcha-badge',
        '.grecaptcha-logo',
        '.g-recaptcha',
        '.grecaptcha-overlay',
        'iframe[src*="recaptcha"]',
        'div[style*="z-index: 2000000000"]', // reCAPTCHA overlay
      ];
      
      // Remove each type of element
      elementsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          try {
            // For iframes, handle parent containers
            if (el.tagName === 'IFRAME' && el.parentNode) {
              const parent = el.parentNode as Element;
              // Only remove if not in our container
              if (parent && !parent.closest(`#${containerId}`)) {
                // If it's in a hierarchy, try to remove the top level container
                let topParent = parent;
                for (let i = 0; i < 3; i++) { // Go up max 3 levels
                  if (topParent.parentNode && !(topParent.parentNode as Element).closest(`#${containerId}`)) {
                    topParent = topParent.parentNode as Element;
                  } else {
                    break;
                  }
                }
                
                // Now remove the top level container if possible
                if (topParent && topParent.parentNode) {
                  topParent.parentNode.removeChild(topParent);
                }
              }
            } else if (el.parentNode && !(el as Element).closest(`#${containerId}`)) {
              // For other elements, just remove directly
              el.parentNode.removeChild(el);
            }
          } catch (error) {
            console.log(`Failed to remove ${selector} element`);
          }
        });
      });

      // Clean our specific container
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }

      // Remove style elements
      document.querySelectorAll(`style#recaptcha-style-${containerId}`).forEach(el => {
        try {
          el.remove();
        } catch (styleError) {
          console.log('Failed to remove a style element, continuing cleanup');
        }
      });
      
      // Set initialization flag to false since we've cleaned up
      isRecaptchaInitialized = false;
    } catch (error) {
      console.error('Error during reCAPTCHA cleanup:', error);
      // Continue with component rendering even if cleanup fails
    }
  };

  // Force cleanup before initialization
  useEffect(() => {
    // If another instance is already initialized, clean it up first
    if (isRecaptchaInitialized) {
      try {
        cleanupAllRecaptcha();
        console.log("Cleaned up existing reCAPTCHA before initializing new one");
      } catch (error) {
        console.log("Error cleaning up existing reCAPTCHA:", error);
      }
    }

    // Prevent multiple instances
    isRecaptchaInitialized = true;
    
    // Add global style to prevent duplicates
    addGlobalReCaptchaStyle();
    
    // First clean up any existing reCAPTCHA instances - wrap in try/catch
    try {
      cleanupAllRecaptcha();
    } catch (cleanupError) {
      console.log('Initial cleanup failed, continuing with initialization', cleanupError);
    }
    
    // Add a slight delay to ensure cleanup is complete
    const initTimer = setTimeout(() => {
      try {
        // Ensure the container exists
        const container = document.getElementById(containerId);
        if (!container) {
          console.error(`Container with ID "${containerId}" not found`);
          return;
        }

        // Add inline CSS for better reCAPTCHA appearance
        const styleId = `recaptcha-style-${containerId}`;
        if (!document.getElementById(styleId)) {
          const styleElement = document.createElement('style');
          styleElement.id = styleId;
          styleElement.textContent = `
            #${containerId} iframe {
              display: block !important;
              margin: 0 auto !important;
              transition: all 0.3s ease;
            }
            
            #${containerId} div[style*="visibility: visible"] {
              display: flex !important;
              justify-content: center !important;
              margin: 0 auto !important;
            }
            
            .g-recaptcha {
              transform: scale(0.98);
              transform-origin: center;
              margin: 0 auto;
            }
            
            /* Hide any extra containers */
            body > div > div > iframe[src*="recaptcha"]:not([src*="bframe"]) {
              visibility: hidden !important;
              position: absolute !important;
              left: -9999px !important;
            }
            
            .verified-recaptcha {
              border: 1px solid #10b981 !important;
              background-color: #f0fdf4 !important;
            }
          `;
          document.head.appendChild(styleElement);
        }

        // Initialize the RecaptchaVerifier
        console.log(`Initializing RecaptchaVerifier in ${containerId}`);
        try {
          const appVerifier = new RecaptchaVerifier(auth, containerId, {
            size: 'normal',
            callback: () => {
              console.log('reCAPTCHA verification successful');
              setIsVerified(true);
              setMessage({
                text: 'Xác thực thành công! Đang gửi mã OTP...',
                type: 'success'
              });
              
              // Add success class to container
              const verifiedContainer = document.getElementById(containerId);
              if (verifiedContainer) {
                verifiedContainer.classList.add('verified-recaptcha');
              }
              
              // Notify parent component of successful verification
              // Use setTimeout to ensure this happens after verification is complete
              if (onVerified && appVerifier) {
                // Use setTimeout to avoid recursive render issues
                setTimeout(() => {
                  // Ensure the verifier wasn't cleared in the meantime
                  if (appVerifier && typeof appVerifier.clear === 'function') {
                    onVerified(appVerifier);
                  }
                }, 0);
              }
            },
            'error-callback': (error: unknown) => {
              console.error('reCAPTCHA verification failed:', error);
              setIsVerified(false);
              setMessage({
                text: 'Xác thực thất bại. Vui lòng thử lại.',
                type: 'error'
              });
            }
          });

          // Store the verifier in both our ref and the window object
          verifierRef.current = appVerifier;
          window.recaptchaVerifier = appVerifier;

          // Render the reCAPTCHA widget with retry logic
          const renderRecaptcha = (retryCount = 0) => {
            appVerifier.render()
              .then((widgetId) => {
                console.log('reCAPTCHA rendered with widget ID:', widgetId);
                window.recaptchaWidgetId = widgetId;
                
                // Apply some customizations after rendering
                setTimeout(() => {
                  try {
                    // Hide any duplicate reCAPTCHA containers that might appear elsewhere
                    document.querySelectorAll('iframe[src*="recaptcha"]').forEach(iframe => {
                      const parent = iframe.parentElement;
                      if (parent && !parent.closest(`#${containerId}`)) {
                        const grandparent = parent.parentElement;
                        if (grandparent && !grandparent.closest(`#${containerId}`)) {
                          grandparent.style.display = 'none';
                        }
                      }
                    });
                    
                    // Set proper title on our main iframe
                    const iframe = document.querySelector(`#${containerId} iframe[title="reCAPTCHA"]`);
                    if (iframe) {
                      iframe.setAttribute('title', 'Xác thực bảo mật');
                    }
                  } catch (customizationError) {
                    console.log('Error applying customizations:', customizationError);
                  }
                }, 500);
              })
              .catch(error => {
                console.error('Error rendering reCAPTCHA:', error);
                
                // Retry logic for render failures (up to 2 retries)
                if (retryCount < 2) {
                  console.log(`Retrying reCAPTCHA render (attempt ${retryCount + 1})`);
                  setTimeout(() => renderRecaptcha(retryCount + 1), 1000);
                } else {
                  setMessage({
                    text: 'Không thể tải widget xác thực. Vui lòng thử lại sau.',
                    type: 'error'
                  });
                }
              });
          };

          // Start the render process
          renderRecaptcha();
        } catch (verifierError) {
          console.error('Error creating RecaptchaVerifier:', verifierError);
          setMessage({
            text: 'Lỗi khởi tạo xác thực. Vui lòng thử lại sau.',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Error in reCAPTCHA initialization:', error);
        setMessage({
          text: 'Lỗi khởi tạo xác thực. Vui lòng thử lại sau.',
          type: 'error'
        });
      }
    }, 200); // Longer delay to ensure cleanup is complete

    // Cleanup on component unmount
    return () => {
      clearTimeout(initTimer);
      try {
        // Check if we're in development mode
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
                             
        // In development mode, if verification occurred, do minimal cleanup
        if (isDevelopment && isVerified) {
          console.log("Skipping aggressive reCAPTCHA cleanup in development because verification occurred");
          
          // Just hide any badges that might be showing outside our container
          document.querySelectorAll('.grecaptcha-badge').forEach(el => {
            try {
              if (el.parentNode && !(el as Element).closest(`#${containerId}`)) {
                (el as HTMLElement).style.visibility = 'hidden';
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          });
        } else {
          // If no verification occurred or we're in production, do full cleanup
          cleanupAllRecaptcha();
          // Reset the initialization flag when unmounted
          isRecaptchaInitialized = false;
          console.log("reCAPTCHA instance cleanup complete");
        }
      } catch (unmountCleanupError) {
        console.log('Cleanup during unmount failed:', unmountCleanupError);
      }
    };
  }, [onVerified, containerId]);

  // Nếu người dùng đã đăng nhập, không hiển thị reCAPTCHA
  if (user) {
    return null;
  }

  // Only show messages when needed
  return isVerified ? (
    <div className="flex items-center justify-center py-2 text-sm text-green-600">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Đã xác minh thành công
    </div>
  ) : message.type === 'error' ? (
    <div className="text-center text-sm text-red-600 py-2">{message.text}</div>
  ) : null;
};

export default RecaptchaContainer; 