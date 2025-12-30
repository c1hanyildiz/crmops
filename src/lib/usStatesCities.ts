export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

export const MAJOR_US_CITIES = [
  { city: 'New York', state: 'NY', zip: '10001' },
  { city: 'Los Angeles', state: 'CA', zip: '90001' },
  { city: 'Chicago', state: 'IL', zip: '60601' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Philadelphia', state: 'PA', zip: '19019' },
  { city: 'San Antonio', state: 'TX', zip: '78201' },
  { city: 'San Diego', state: 'CA', zip: '92101' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'San Jose', state: 'CA', zip: '95101' },
  { city: 'Austin', state: 'TX', zip: '78701' },
  { city: 'Jacksonville', state: 'FL', zip: '32099' },
  { city: 'Fort Worth', state: 'TX', zip: '76101' },
  { city: 'Columbus', state: 'OH', zip: '43085' },
  { city: 'Charlotte', state: 'NC', zip: '28201' },
  { city: 'San Francisco', state: 'CA', zip: '94101' },
  { city: 'Indianapolis', state: 'IN', zip: '46201' },
  { city: 'Seattle', state: 'WA', zip: '98101' },
  { city: 'Denver', state: 'CO', zip: '80201' },
  { city: 'Boston', state: 'MA', zip: '02101' },
  { city: 'Nashville', state: 'TN', zip: '37201' },
  { city: 'Detroit', state: 'MI', zip: '48201' },
  { city: 'Portland', state: 'OR', zip: '97201' },
  { city: 'Las Vegas', state: 'NV', zip: '89101' },
  { city: 'Miami', state: 'FL', zip: '33101' },
  { city: 'Atlanta', state: 'GA', zip: '30301' },
  { city: 'Brooklyn', state: 'NY', zip: '11201' },
  { city: 'Bronx', state: 'NY', zip: '10451' },
  { city: 'Queens', state: 'NY', zip: '11361' },
  { city: 'Manhattan', state: 'NY', zip: '10001' },
  { city: 'Staten Island', state: 'NY', zip: '10301' },
];

export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

export function formatZipCode(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 0) return '';
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
}

export function normalizeStateCode(value: string): string {
  const upper = value.toUpperCase().trim();

  const state = US_STATES.find(s =>
    s.code === upper ||
    s.name.toUpperCase() === upper
  );

  return state ? state.code : upper.slice(0, 2);
}

export function searchCities(query: string): typeof MAJOR_US_CITIES {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return MAJOR_US_CITIES.filter(city =>
    city.city.toLowerCase().includes(lowerQuery) ||
    city.state.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
}
