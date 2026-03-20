import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'availability_cache_version')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ version: String(data?.value || '') }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
