// Firmendaten aus .env — hier nichts ändern!
// Änderungen nur in .env (lokal) oder Railway Variables (Production)

export const company = {
  name:          process.env.NEXT_PUBLIC_COMPANY_NAME     || 'My Dressa GmbH',
  owner:         process.env.NEXT_PUBLIC_COMPANY_OWNER    || 'Inhaber',
  street:        process.env.NEXT_PUBLIC_COMPANY_STREET   || 'Musterstraße 1',
  city:          process.env.NEXT_PUBLIC_COMPANY_CITY     || '10115 Berlin',
  country:       process.env.NEXT_PUBLIC_COMPANY_COUNTRY  || 'Deutschland',
  email:         process.env.NEXT_PUBLIC_COMPANY_EMAIL    || 'info@mydressa.de',
  website:       process.env.NEXT_PUBLIC_COMPANY_WEBSITE  || 'www.mydressa.de',
  registerCourt: process.env.NEXT_PUBLIC_COMPANY_REGISTER_COURT || 'Amtsgericht Berlin-Charlottenburg',
  registerNr:    process.env.NEXT_PUBLIC_COMPANY_REGISTER_NR    || 'in Beantragung',
  vatId:         process.env.NEXT_PUBLIC_COMPANY_VAT_ID   || 'in Beantragung',
}
