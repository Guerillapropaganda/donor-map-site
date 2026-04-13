/**
 * Politician name normalization — shared across all Capitol Trades APIs
 *
 * Strips honorifics, normalizes suffixes, merges known variants
 * so "Hon. Scott Franklin", "Mr. Scott Franklin", "Hon. C. Scott Franklin"
 * all become "Scott Franklin"
 */

export function normalizePoliticianName(raw: string): string {
  let name = raw.trim()
  name = name.replace(/^(Hon\.|Mr\.|Mrs\.|Ms\.|Dr\.|Rep\.|Sen\.)\s*/i, '')
  name = name.replace(/\s+(Honorable|Hon|Mr|Mrs|Dr|MD|FACS)\s*/gi, ' ')
  name = name.replace(/,?\s*(Jr\.?|Sr\.?|III|IV|II)$/i, (_, suf) => ' ' + suf.replace('.', ''))
  name = name.replace(/\s+[A-Z]\.\s+/g, ' ')
  name = name.replace(/^[A-Z]\.\s+/, '')
  name = name.replace(/\s+/g, ' ').trim()
  return name
}

export const NAME_OVERRIDES: Record<string, string> = {
  'Barbara J Honorable Comstock': 'Barbara Comstock',
  'Barbara J. Comstock': 'Barbara Comstock',
  'Carlos Mr Curbelo': 'Carlos Curbelo',
  'Scott Scott Franklin': 'Scott Franklin',
  'Scott Mr Franklin': 'Scott Franklin',
  'Mark Dr Green': 'Mark Green',
  'Kim Dr Schrier': 'Kim Schrier',
  'Marjorie Taylor Mrs Greene': 'Marjorie Taylor Greene',
  'Neal Patrick MD, Facs Dunn': 'Neal Dunn',
  'Neal Patrick MD, FACS Dunn': 'Neal Dunn',
  'Neal P. Dunn': 'Neal Dunn',
  'James E Hon Banks': 'James Banks',
  'James E. Banks': 'James Banks',
  'Nicholas Van Taylor': 'Van Taylor',
  'Nicholas V. Taylor': 'Van Taylor',
  'Donald Sternoff Beyer Jr': 'Don Beyer',
  'Donald Sternoff Honorable Beyer Jr': 'Don Beyer',
  'Donald Sternoff Beyer Jr.': 'Don Beyer',
  'Robert C. "Bobby" Scott': 'Bobby Scott',
  'John J. Duncan Jr.': 'John Duncan Jr',
  'John J. Duncan Jr': 'John Duncan Jr',
  'Thomas H. Kean Jr.': 'Tom Kean Jr',
  'Thomas H. Kean Jr': 'Tom Kean Jr',
  'Thomas H. Kean': 'Tom Kean',
  'Harley E. Rouda Jr.': 'Harley Rouda',
  'Harley E. Rouda Jr': 'Harley Rouda',
  'W. Greg Steube': 'Greg Steube',
  'Thomas C MacArthur': 'Tom MacArthur',
  'Rudy C. Yakym III': 'Rudy Yakym',
  'Rudy Yakym III': 'Rudy Yakym',
  'Joseph P. Kennedy III': 'Joe Kennedy',
  'Curtis J. Clawson': 'Curt Clawson',
  'K. Michael Conaway': 'Mike Conaway',
  'David Cheston Rouzer': 'David Rouzer',
  'Rodney Leland Blum': 'Rod Blum',
  'Michael A. Collins Jr': 'Mike Collins',
  'Michael A. Collins': 'Mike Collins',
  'Thomas R. Suozzi': 'Tom Suozzi',
  'Thomas Suozzi': 'Tom Suozzi',
  'Patrick Erin Murphy': 'Patrick Murphy',
  'John Thomas Graves Jr.': 'Tom Graves',
  'Tom Thomas Graves Jr.': 'Tom Graves',
  'Felix Barry Moore': 'Barry Moore',
  'Christopher L. Jacobs': 'Chris Jacobs',
  'Deborah K. Ross': 'Deborah Ross',
  'Alan Mark Grayson': 'Alan Grayson',
  'David A. Trott': 'Dave Trott',
  'RICHARD BLUMENTHAL': 'Richard Blumenthal',
  'William F Hagerty, IV': 'Bill Hagerty',
  'Thomas H Tuberville': 'Tommy Tuberville',
  'Shelley M Capito': 'Shelley Moore Capito',
}

export function resolvePolName(raw: string): string {
  const stripped = raw.replace(/^Hon\.\s*/, '')
  const override = NAME_OVERRIDES[raw] || NAME_OVERRIDES[stripped]
  if (override) return override
  return normalizePoliticianName(raw)
}

export function cleanFilingDelay(delay: number | undefined): { days: number | null; isLate: boolean } {
  if (delay === undefined || delay === null) return { days: null, isLate: false }
  if (delay < 0) return { days: null, isLate: false }
  if (delay > 365) return { days: null, isLate: false }
  return { days: delay, isLate: delay > 45 }
}
