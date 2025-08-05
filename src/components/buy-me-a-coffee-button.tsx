// src/components/buy-me-a-coffee-button.tsx
'use client';

import Script from 'next/script';
import React from 'react';

const BuyMeACoffeeButton = () => {
  return (
    <>
      <Script
        src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
        data-name="bmc-button"
        data-slug="mashhul"
        data-color="#ea1757"
        data-emoji="🎲"
        data-font="Lato"
        data-text="Buy me a dice set"
        data-outline-color="#ffffff"
        data-font-color="#ffffff"
        data-coffee-color="#FFDD00"
        strategy="afterInteractive"
      />
    </>
  );
};

export default BuyMeACoffeeButton;
