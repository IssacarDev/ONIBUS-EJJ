export type BusType = 'Executivo' | 'Convencional';
export type Availability = 'Disponível' | 'Sem disponibilidade nesta data' | 'A confirmar';
export type ReserveBus = 'Possui ônibus reserva' | 'Não possui ônibus reserva' | 'Não informado';
export type QuoteStatus = 'Solicitada' | 'Recebida' | 'Em negociação' | 'Selecionada' | 'Recusada' | 'Indisponível';

export type Company = { id: string; contactName: string; companyName: string; whatsapp: string; busSize: number; busType: BusType; createdAt: string };
export type Trip = { id: string; name: string; location: string; startDate: string; endDate: string; stops: string; createdAt: string };
export type Quote = { id: string; tripId: string; companyId: string; contactName: string; companyName: string; busSize: number; busType: BusType; availability: Availability; reserveBus: ReserveBus; totalValue: number | null; depositPercent: number | null; paymentMethod: string | null; status: QuoteStatus; validUntil: string | null; proposalLink: string | null; notes: string | null; createdAt: string };
