const formatCOP = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

const formatCOPCompact = (amount) => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return formatCOP(amount)
}

const parseCOP = (str) => {
  return parseInt(str.replace(/[^0-9-]/g, ''), 10) || 0
}

const test = (name, actual, expected) => {
  if (actual === expected) {
    console.log(`✅ ${name}: ${actual}`)
  } else {
    console.log(`❌ ${name}: expected ${expected}, got ${actual}`)
    process.exit(1)
  }
}

console.log('Testing Currency Utilities Logic...')

const normalize = (s) => s.replace(/\s/g, ' ').replace(/\u00A0/g, ' ')

test('formatCOP(19411.91)', normalize(formatCOP(19411.91)), '$ 19.412')
test('formatCOP(0)', normalize(formatCOP(0)), '$ 0')
test('formatCOP(1000000)', normalize(formatCOP(1000000)), '$ 1.000.000')

test('formatCOPCompact(1300000)', formatCOPCompact(1300000), '$1.3M')
test('formatCOPCompact(87000)', formatCOPCompact(87000), '$87k')
test('formatCOPCompact(12000)', formatCOPCompact(12000), '$12k')

test('parseCOP("$19.412")', parseCOP('$19.412'), 19412)
test('parseCOP("$ 1.000.000")', parseCOP('$ 1.000.000'), 1000000)
test('parseCOP("-10.000")', parseCOP('-10.000'), -10000)

console.log('All logic tests passed!')
