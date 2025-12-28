import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface CustomerData {
  name: string;
  email: string;
  document: string;
  phone: string;
}

const STORAGE_KEY = 'customer_data';

// Dados padrão fixos (sempre sobrescreve)
const DEFAULT_CUSTOMER: CustomerData = {
  name: 'Eleuza Rodrigues Chaveiro',
  email: 'rodrigueseleuza@gmail.com',
  document: '46730540168', // CPF sem pontos/traços
  phone: '62993067622',    // Telefone sem formatação
};

export const useCustomerData = () => {
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<CustomerData>(DEFAULT_CUSTOMER);

  useEffect(() => {
    // Sempre usa os dados padrão fixos (sobrescreve qualquer coisa)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOMER));
    setCustomer(DEFAULT_CUSTOMER);
  }, [searchParams]);

  const getCustomerQueryString = () => {
    return `?email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name)}&document=${encodeURIComponent(customer.document)}&phone=${encodeURIComponent(customer.phone)}`;
  };

  return { customer, getCustomerQueryString };
};
