import { redirect } from 'next/navigation'

export default function BookingByStaff({ params }) {
  const staffId = params?.staffId ? String(params.staffId) : ''
  redirect(`/booking?staffId=${encodeURIComponent(staffId)}`)
}

