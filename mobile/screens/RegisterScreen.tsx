import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRegister = async () => {
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id, username, full_name: fullName,
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
      setSuccess('Account created! Please login to continue.')
      setTimeout(() => navigation.replace('Login'), 2000)
    }
    setLoading(false)
  }

  const inputStyle = {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 16
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32, marginTop: 16 }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8 }}>Create account</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Sign up to get started</Text>
          {error !== '' && (
            <View style={{ backgroundColor: '#2a1515', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
            </View>
          )}
          {success !== '' && (
            <View style={{ backgroundColor: '#0f2a1a', borderWidth: 1, borderColor: '#22c55e', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#22c55e', fontSize: 13 }}>{success}</Text>
            </View>
          )}
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Full name</Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Enter your full name" placeholderTextColor="#4b5563" style={inputStyle} />
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Username</Text>
          <TextInput value={username} onChangeText={setUsername} placeholder="Enter your username" placeholderTextColor="#4b5563" autoCapitalize="none" style={inputStyle} />
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#4b5563" keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Password</Text>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <TextInput value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor="#4b5563" secureTextEntry={!showPassword} style={{ ...inputStyle, marginBottom: 0, paddingRight: 50 }} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Confirm password</Text>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" placeholderTextColor="#4b5563" secureTextEntry style={inputStyle} />
          <TouchableOpacity onPress={handleRegister} disabled={loading} style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
            <Text style={{ color: '#000000', fontSize: 15, fontWeight: '700' }}>{loading ? 'Creating account...' : 'Sign up'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>Already have an account? <Text style={{ color: '#ffffff', fontWeight: '700' }}>Login</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}