import { ContractTypeDto, InstrumentDto, Order, OrderDto } from './models';

export type ContractSizeLookup = (symbol: string) => number | null;

export function createContractSizeLookup(
  instruments: readonly InstrumentDto[],
  contractTypes: readonly ContractTypeDto[],
): ContractSizeLookup {
  const contractSizeByType = new Map(
    contractTypes.map((contract) => [contract.contractType, contract.contractSize]),
  );
  const contractTypeBySymbol = new Map(
    instruments.map((instrument) => [instrument.symbol, instrument.contractType]),
  );
  return (symbol) => {
    const type = contractTypeBySymbol.get(symbol);
    if (type === undefined) console.warn('WARNING: no contract type registered for ', symbol);
    return type === undefined ? null : (contractSizeByType.get(type) ?? null);
  };
}

export function transformToOrder(dto: OrderDto, getContractSize: ContractSizeLookup): Order {
  return {
    id: dto.id,
    symbol: dto.symbol,
    side: dto.side,
    size: dto.size,
    openPrice: dto.openPrice,
    openTime: dto.openTime,
    swap: dto.swap,
    contractSize: getContractSize(dto.symbol),
  };
}
