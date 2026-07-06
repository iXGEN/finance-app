/** CLP display formatting: integer pesos, es-CL thousands separator: "$1.234.567". */
export function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}
