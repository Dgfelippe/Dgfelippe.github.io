import { describe, expect, it } from 'vitest'

import { calculateAbnt, parseFiberReference } from './abnt'

describe('ABNT fiber identification', () => {
  it.each([
    [1, 1, 'VERDE', 1, 'VERDE'],
    [8, 1, 'VERDE', 8, 'ROSA'],
    [15, 2, 'AMARELO', 3, 'BRANCO'],
    [144, 12, 'AQUA', 12, 'AQUA'],
  ])(
    'calculates global fiber %i without shifting colors',
    (globalFiber, group, groupColor, fiber, fiberColor) => {
      expect(calculateAbnt(globalFiber)).toEqual({
        globalFiber,
        group,
        groupColor,
        fiber,
        fiberColor,
      })
    },
  )

  it.each([0, -1, 145, 1.5])('rejects invalid global fiber %s', (value) => {
    expect(() => calculateAbnt(value)).toThrow(RangeError)
  })

  it.each([
    ['Fibra03', 3],
    ['fibra 11', 11],
    ['G1-F8', 8],
    ['G2-F7', 19],
    ['19', 19],
    ['S2-P07', null],
    ['', null],
  ])('parses reference %j as %s', (input, expected) => {
    expect(parseFiberReference(input)).toBe(expected)
  })
})
