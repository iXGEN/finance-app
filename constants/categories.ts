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
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Arriendo': '#4A90E2',
  'Supermercado': '#7ED321',
  'Entretenimiento y restaurantes': '#F5A623',
  'Suscripciones': '#9013FE',
  'Transporte': '#50E3C2',
  'Medicamentos y Medicina': '#D0021B',
  'Gastos comunes edificio': '#4A4A4A',
  'Cuenta de luz': '#F8E71C',
  'Cuenta de agua': '#0288D1',
  'Telefonía': '#E91E63',
  'Cuenta de internet hogar': '#00BCD4',
  'Verdurería': '#8BC34A',
  'Lavandería': '#795548',
  'Agua': '#03A9F4',
  'Otros': '#9E9E9E',
};
