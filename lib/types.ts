export type BusType = 'Executivo' | 'Convencional';
export type Availability = 'Disponível' | 'Sem disponibilidade nesta data' | 'A confirmar';
export type ReserveBus = 'Possui ônibus reserva' | 'Não possui ônibus reserva' | 'Não informado';
export type QuoteStatus = 'Solicitada' | 'Recebida' | 'Em negociação' | 'Selecionada' | 'Recusada' | 'Indisponível';

export type Company = { id: string; contactName: string; companyName: string; whatsapp: string; busSize: number; busType: BusType; createdAt: string };
export type Trip = { id: string; name: string; location: string; startDate: string; endDate: string; stops: string; createdAt: string };
export type Quote = { id: string; tripId: string; companyId: string; contactName: string; companyName: string; busSize: number; busType: BusType; availability: Availability; reserveBus: ReserveBus; totalValue: number | null; depositPercent: number | null; paymentMethod: string | null; status: QuoteStatus; validUntil: string | null; proposalLink: string | null; notes: string | null; createdAt: string };

export type PaymentStatus = 'Pago' | 'Pago parcial' | 'Pago pelo pastor' | 'Pago Davy' | 'Reservado a pagar' | 'Suplência';
export type AttendanceStatus = 'Pendente' | 'Presente' | 'Ausente';
export type PassengerList = { id: string; name: string; capacity: number; defaultValue: number; busTotal: number; cashBalance: number; boardingPoints: string; travelStartedAt: string | null; travelMovingAt: string | null; movingSeconds: number; travelEndedAt: string | null; activeBoardingPoint: string | null; pointArrivals: Record<string, string>; createdAt: string };
export type Passenger = { id: string; listId: string; name: string; status: PaymentStatus; usesSeat: boolean; chargeTo: string; amount: number; receivedAmount: number; discount: number; notes: string; attendanceStatus: AttendanceStatus; attendanceAt: string | null; createdAt: string };
export type CashOutflow = { id: string; listId: string; recipient: string; amount: number; reason: string; createdAt: string };
export type BoardingResponse = { id: string; listId: string; fullName: string; phone: string; boardingPoint: string; passengerId: string | null; passengerName: string | null; createdAt: string };
