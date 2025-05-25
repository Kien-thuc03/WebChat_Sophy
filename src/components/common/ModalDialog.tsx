import React, { useEffect, useState } from 'react';
import modalService, { ModalOptions } from '../../services/modalService';
import './ModalDialog.css';

const ModalDialog: React.FC = () => {
  const [modalData, setModalData] = useState<ModalOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const subscription = modalService.modalState$.subscribe((modalOptions) => {
      if (modalOptions) {
        setModalData(modalOptions);
        setIsVisible(true);
        
        // Auto close if enabled
        if (modalOptions.autoClose) {
          const delay = modalOptions.autoCloseDelay || 3000;
          setTimeout(() => {
            handleClose();
          }, delay);
        }
      } else {
        setIsVisible(false);
        setTimeout(() => setModalData(null), 300); // Wait for animation
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    
    if (modalData?.onClose) {
      modalData.onClose();
    }
    
    if (modalData?.redirectUrl) {
      setTimeout(() => {
        window.location.href = modalData.redirectUrl as string;
      }, 300); // Wait for animation
    } else {
      setTimeout(() => {
        modalService.closeModal();
      }, 300); // Wait for animation
    }
  };

  if (!modalData) return null;

  const getIconClass = () => {
    switch (modalData.type) {
      case 'error': return 'modal-icon-error';
      case 'success': return 'modal-icon-success';
      case 'warning': return 'modal-icon-warning';
      default: return 'modal-icon-info';
    }
  };

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`modal-container ${isVisible ? 'visible' : ''}`}>
        <div className={`modal-content ${modalData.type || 'info'}`}>
          {modalData.type && (
            <div className={`modal-icon ${getIconClass()}`}>
              {modalData.type === 'error' && '❌'}
              {modalData.type === 'success' && '✓'}
              {modalData.type === 'warning' && '⚠️'}
              {modalData.type === 'info' && 'ℹ️'}
            </div>
          )}
          
          {modalData.title && <h3 className="modal-title">{modalData.title}</h3>}
          <div className="modal-message">{modalData.message}</div>
          
          {(modalData.showClose !== false) && (
            <button className="modal-close-btn" onClick={handleClose}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDialog; 