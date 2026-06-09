import { formatCOP, formatCOPCompact, parseCOP } from './src/lib/currency.js'

const test = (name, actual, expected) => {
  if (actual === expected) {
    console.log(`✅ ${name}: ${actual}`)
  } else {
    console.log(`❌ ${name}: expected ${expected}, got ${actual}`)
    process.exit(1)
  }
}

console.log('Testing Currency Utilities...')

// Use non-breaking space if Intl.NumberFormat adds it (it often does for COP)
// Let's check what the actual output is first
const sample = formatCOP(19411.91)
const expectedSample = '$ 19.412' // Colombian format often has a non-breaking space after $
console.log(`Sample output: "${sample}"`)

// Adjusting tests based on actual browser/node behavior for es-CO
test('formatCOP(19411.91)', formatCOP(19411.91).replace(/\s/g, ' '), '$ 19.412')
test('formatCOP(0)', formatCOP(0).replace(/\s/g, ' '), '$ 0')
test('formatCOP(1000000)', formatCOP(1000000).replace(/\s/g, ' '), '$ 1.000.000')

test('formatCOPCompact(1300000)', formatCOPCompact(1300000), '$1.3M')
test('formatCOPCompact(87000)', formatCOPCompact(87000), '$87k')
test('formatCOPCompact(12000)', formatCOPCompact(12000).replace(/\s/g, ' '), '$ 12.000')

test('parseCOP("$19.412")', parseCOP('$19.412'), 19412)
test('parseCOP("$ 1.000.000")', parseCOP('$ 1.000.000'), 1000000)
test('parseCOP("-10.000")', parseCOP('-10.000'), -10000)

console.log('All tests passed!')
