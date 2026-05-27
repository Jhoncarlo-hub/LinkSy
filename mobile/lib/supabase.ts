import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ueytkskcsrtbnvawvxka.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleXRrc2tjc3J0Ym52YXd2eGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDg3MTYsImV4cCI6MjA5NTA4NDcxNn0.ipOo2bul4GBxr7R1s_qxvknKkvOYKyAb14eblZOavVI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: global.fetch,
  },
})