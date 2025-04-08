import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag } from '@fortawesome/free-solid-svg-icons';

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: Array<{
    id: string;
    name: string;
    color: string;
    selected: boolean;
  }>;
  onLabelSelect: (labelId: string) => void;
  onManageLabels: () => void;
}

const LabelModal: React.FC<LabelModalProps> = ({
  isOpen,
  onClose,
  labels,
  onLabelSelect,
  onManageLabels,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        className="bg-white rounded-lg shadow-xl w-96 max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Phân loại</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Đóng</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            <div className="px-1 py-2 font-bold text-gray-600">
              <span>Theo thẻ phân loại</span>
            </div>
            
            {labels.map((label) => (
              <div 
                key={label.id} 
                className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer my-1"
                onClick={() => onLabelSelect(label.id)}
              >
                <div className="mr-3">
                  <div className="flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect 
                        x="5.25" 
                        y="5.25" 
                        width="14.5" 
                        height="14.5" 
                        rx="2.25" 
                        fill={label.selected ? label.color : "white"} 
                        stroke="#ccc" 
                        strokeWidth="1.5"
                      />
                      {label.selected && (
                        <path 
                          d="M9 12.5L11.5 15L16 10" 
                          stroke="white" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </div>
                </div>
                <div className="mr-2" style={{ color: label.color }}>
                  <FontAwesomeIcon icon={faTag} />
                </div>
                <div className="truncate flex-1 text-gray-700">{label.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <button
              onClick={onManageLabels}
              className={`w-full p-2 text-center rounded-full ${labels.some(l => l.selected) ? 'bg-blue-100 text-blue-600 font-medium' : 'text-blue-500 hover:bg-gray-100'}`}
            >
              Quản lý thẻ phân loại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelModal;