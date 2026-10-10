// Cutco campaigns run in 4-month blocks: Jan-Apr, May-Aug, Sep-Dec.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const pad = (n) => String(n).padStart(2, '0')

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (iso, n) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const today = () => toISO(new Date())

// Monday of the week containing iso.
export const weekStart = (iso) => {
  const d = fromISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export const weekDays = (iso) => {
  const start = weekStart(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const campaignOf = (iso) => {
  const d = fromISO(iso)
  const year = d.getFullYear()
  const index = Math.floor(d.getMonth() / 4) + 1
  return campaign(year, index)
}

export const campaign = (year, index) => {
  const startMonth = (index - 1) * 4
  return {
    key: `${year}-C${index}`,
    year,
    index,
    startMonth,
    start: toISO(new Date(year, startMonth, 1)),
    end: toISO(new Date(year, startMonth + 4, 0)),
    name: `Campaign ${index}`,
    span: `${MONTHS[startMonth]}–${MONTHS[startMonth + 3]}`,
    months: [0, 1, 2, 3].map((i) => ({ month: startMonth + i, label: MONTHS[startMonth + i] })),
  }
}

export const campaignsOfYear = (year) => [1, 2, 3].map((i) => campaign(year, i))

// Weeks (by Monday) that start inside the campaign.
export const weeksOfCampaign = (c) => {
  const weeks = []
  let w = weekStart(c.start)
  if (w < c.start) w = addDays(w, 7)
  while (w <= c.end) {
    weeks.push(w)
    w = addDays(w, 7)
  }
  return weeks
}

// Campaign a given week (Monday) belongs to, plus the campaign key used for goals.
export const weekCampaignKey = (weekIso) => campaignOf(weekIso).key

export const fmtDay = (iso) => {
  const d = fromISO(iso)
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export const fmtShort = (iso) => {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export const dayName = (iso) => DAYS[fromISO(iso).getDay()]

export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000)
