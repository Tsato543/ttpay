import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface CustomerData {
  name: string;
  email: string;
  document: string;
  phone: string;
}

const STORAGE_KEY = 'customer_data';

export const useCustomerData = () => {
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    // Try to get from URL params first
    const email = searchParams.get('email') || searchParams.get('e') || '';
    const name = searchParams.get('name') || searchParams.get('nome') || searchParams.get('n') || '';
    const document = searchParams.get('document') || searchParams.get('cpf') || searchParams.get('d') || '';
    const phone = searchParams.get('phone') || searchParams.get('telefone') || searchParams.get('p') || '';

    if (email || name || document) {
      const customerData: CustomerData = {
        email: email || 'cliente@email.com',
        name: name || 'Cliente',
        document: document.replace(/\D/g, '') || '00000000000',
        phone: phone.replace(/\D/g, '') || '00000000000',
      };
      
      // Save to localStorage for subsequent upsells
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));
      setCustomer(customerData);
    } else {
      // Try to get from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setCustomer(JSON.parse(stored));
        } catch {
          setCustomer(null);
        }
      }
    }
  }, [searchParams]);

  const getCustomerQueryString = () => {
    if (!customer) return '';
    return `?email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name)}&document=${encodeURIComponent(customer.document)}&phone=${encodeURIComponent(customer.phone)}`;
  };

  return { customer, getCustomerQueryString };
};
