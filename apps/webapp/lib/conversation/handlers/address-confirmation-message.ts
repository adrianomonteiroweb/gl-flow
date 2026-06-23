type AddressFields = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export const buildAddressConfirmationText = (addr: AddressFields): string => {
  const streetPart = addr.street ? `${addr.street}, ${addr.number}` : `Nº ${addr.number}`;
  const neighborhoodPart = addr.neighborhood ? ` - ${addr.neighborhood}` : '';
  const cityState = [addr.city, addr.state].filter(Boolean).join('/');
  const cityStatePart = cityState ? `, ${cityState}` : '';
  return `Encontramos o seguinte endereço:\n${streetPart}${neighborhoodPart}${cityStatePart} - CEP ${addr.zipCode}.\nO endereço está correto? (responda *Sim* ou *Não*)`;
};
