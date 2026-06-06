export const CATEGORIES = [
  'Arriendo',
  'Gastos comunes edificio',
  'Cuenta de luz',
  'Cuenta de agua',
  'Telefonía',
  'Cuenta de internet hogar',
  'Suscripciones',
  'Transporte',
  'Supermercado',
  'Verdurería',
  'Medicamentos y Medicina',
  'Entretenimiento y restaurantes',
  'Lavandería',
  'Agua',
  'Otros',
] as const;

export type Category = typeof CATEGORIES[number];

export const PAYMENT_METHODS = [
  'TC Santander',
  'TC CMR',
  'Débito',
  'Transferencia',
  'Efectivo',
  'Deuda',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Arriendo': '#4C9EFF',
  'Supermercado': '#5CDB95',
  'Entretenimiento y restaurantes': '#FFAA00',
  'Suscripciones': '#B68BF7',
  'Transporte': '#00D9CF',
  'Medicamentos y Medicina': '#FF6B7A',
  'Gastos comunes edificio': '#9BA8BC',
  'Cuenta de luz': '#FFD93D',
  'Cuenta de agua': '#4ECAFF',
  'Telefonía': '#FF7FBA',
  'Cuenta de internet hogar': '#00CED9',
  'Verdurería': '#90EE5C',
  'Lavandería': '#E08060',
  'Agua': '#5DADE2',
  'Otros': '#707090',
};
