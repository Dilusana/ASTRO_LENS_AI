/**
 * Static reference positions copied from SIMBAD basic-data pages.
 * These are catalog coordinates, not measurements made by AstroLens X
 * and not NASA observation products.
 *
 * Sources checked 11 Nov 2026:
 * - Sirius, Vega, Betelgeuse, Polaris: ICRS J2000, 2007A&A...474..653V
 * - M 31: ICRS J2000, 2006AJ....131.1163S
 * - M 42: ICRS J2000, 2022A&A...661A..38P
 */
export const CATALOG_META = {
  name: 'Local reference catalog',
  provider: 'SIMBAD',
  frame: 'ICRS',
  epoch: 'J2000',
  note: 'Positions are stored locally for the preset list. Searching a name that is not in this file does not look up or estimate a coordinate.',
}

export const catalog = [
  {
    id: 'sirius',
    name: 'Sirius',
    designation: 'α Canis Majoris',
    aliases: ['alpha canis majoris', 'alf cma', 'dog star'],
    kind: 'Star',
    ra: '06h 45m 08.91728s',
    dec: '−16° 42′ 58.0171″',
    origin: 'Optical',
    bibcode: '2007A&A...474..653V',
  },
  {
    id: 'vega',
    name: 'Vega',
    designation: 'α Lyrae',
    aliases: ['alpha lyrae', 'alf lyr'],
    kind: 'Star',
    ra: '18h 36m 56.33635s',
    dec: '+38° 47′ 01.2802″',
    origin: 'Optical',
    bibcode: '2007A&A...474..653V',
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    designation: 'α Orionis',
    aliases: ['alpha orionis', 'alf ori'],
    kind: 'Star',
    ra: '05h 55m 10.30536s',
    dec: '+07° 24′ 25.4304″',
    origin: 'Optical',
    bibcode: '2007A&A...474..653V',
  },
  {
    id: 'polaris',
    name: 'Polaris',
    designation: 'α Ursae Minoris',
    aliases: ['alpha ursae minoris', 'alf umi', 'north star', 'pole star'],
    kind: 'Star',
    ra: '02h 31m 49.09456s',
    dec: '+89° 15′ 50.7923″',
    origin: 'Optical',
    bibcode: '2007A&A...474..653V',
  },
  {
    id: 'm31',
    name: 'Andromeda Galaxy',
    designation: 'M 31',
    aliases: ['andromeda', 'messier 31', 'ngc 224'],
    kind: 'Galaxy',
    ra: '00h 42m 44.330s',
    dec: '+41° 16′ 07.50″',
    origin: 'Infrared',
    bibcode: '2006AJ....131.1163S',
  },
  {
    id: 'm42',
    name: 'Orion Nebula',
    designation: 'M 42',
    aliases: ['orion', 'messier 42', 'ngc 1976', 'great orion nebula'],
    kind: 'H II region',
    ra: '05h 35m 16.8s',
    dec: '−05° 23′ 15″',
    origin: 'X-ray',
    bibcode: '2022A&A...661A..38P',
  },
]
