// TikTok Pixel Helper Functions
declare global {
  interface Window {
    ttq: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      identify: (params: Record<string, unknown>) => void;
      instance: (pixelId: string) => {
        track: (event: string, params?: Record<string, unknown>) => void;
        page: () => void;
      };
    };
  }
}

export const PIXEL_ID_1 = 'D4CVUIRC77U004J48UKG';
export const PIXEL_ID_2 = 'D57BOH3C77U843EEANI0';

// Track page view
export const trackPageView = () => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.page();
  }
};

// Track ViewContent - when user views a page with content
export const trackViewContent = (contentName: string, value?: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ViewContent', {
      content_name: contentName,
      value: value,
      currency: 'BRL',
    });
  }
};

// Track InitiateCheckout - when user clicks to pay
export const trackInitiateCheckout = (value: number, description: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      value: value,
      currency: 'BRL',
      content_name: description,
    });
  }
};

// Track AddPaymentInfo - when payment info is shown
export const trackAddPaymentInfo = (value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('AddPaymentInfo', {
      value: value,
      currency: 'BRL',
    });
  }
};

// Track Purchase - MOST IMPORTANT - when payment is confirmed
export const trackPurchase = (value: number, description: string, transactionId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('CompletePayment', {
      value: value,
      currency: 'BRL',
      content_name: description,
      content_id: transactionId || `txn_${Date.now()}`,
    });
  }
};

// Track ClickButton - general button click tracking
export const trackClickButton = (buttonName: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ClickButton', {
      content_name: buttonName,
    });
  }
};

// Track SubmitForm - form submission
export const trackSubmitForm = (formName: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('SubmitForm', {
      content_name: formName,
    });
  }
};
