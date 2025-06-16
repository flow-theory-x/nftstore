import React from 'react';

export const YachtIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 12.5L12 3L21 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 8L12 3L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 18L12 11L19 18H5Z" fill="currentColor" fillOpacity="0.3"/>
  </svg>
);

export const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FireIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8.5 14.5C8.5 16.9853 10.5147 19 13 19C15.4853 19 17.5 16.9853 17.5 14.5C17.5 12.0147 15.4853 10 13 10C10.5147 10 8.5 12.0147 8.5 14.5Z" fill="currentColor"/>
    <path d="M13 10C13 8.5 12 7 11 6C10 5 9 4 9 2.5C9 3.5 9.5 4.5 10.5 5.5C11.5 6.5 12.5 7.5 13 10Z" fill="currentColor"/>
    <path d="M15 8C15.5 7 16 6 16 5C16 4 15.5 3.5 15 3C15.5 3.5 16 4 16 5C16 6 15.5 7 15 8Z" fill="currentColor"/>
  </svg>
);

export const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

export const WalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L80 128c-8.8 0-16-7.2-16-16s7.2-16 16-16l368 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 32zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
  </svg>
);

export const DisconnectWalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Wallet shape */}
    <rect x="2" y="8" width="16" height="12" rx="2" fill="currentColor" opacity="0.6"/>
    <circle cx="16" cy="13" r="1.5" fill="white"/>
    
    {/* Disconnect X in circle */}
    <circle cx="18" cy="6" r="4" fill="#dc3545"/>
    <path d="M16.5 4.5L19.5 7.5M19.5 4.5L16.5 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);