export const formatAED = (amount: number): string => {
  return new Intl.NumberFormat('en-AE', { 
    style: 'currency', 
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};