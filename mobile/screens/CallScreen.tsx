import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RtcEngine, {
  RtcLocalView,
  RtcRemoteView,
  VideoRenderMode,
  ChannelProfile,
  ClientRole,
} from 'react-native-agora'

const AGORA_APP_ID = '3243713a187c483591fcc9be1bbb8d28'

export default function CallScreen({ route, navigation }: any) {
  const { channelId, isVideo, callerName, user } = route.params
  const [joined, setJoined] = useState(false)
  const [remoteUid, setRemoteUid] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(!isVideo)
  const [callDuration, setCallDuration] = useState(0)
  const engineRef = useRef<RtcEngine | null>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    initAgora()
    return () => {
      endCall()
    }
  }, [])

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [joined])

  const initAgora = async () => {
    try {
      const engine = await RtcEngine.create(AGORA_APP_ID)
      engineRef.current = engine

      if (isVideo) {
        await engine.enableVideo()
      } else {
        await engine.disableVideo()
      }

      await engine.setChannelProfile(ChannelProfile.Communication)

      engine.addListener('UserJoined', (uid) => {
        setRemoteUid(uid)
      })

      engine.addListener('UserOffline', () => {
        setRemoteUid(null)
        endCall()
      })

      engine.addListener('JoinChannelSuccess', () => {
        setJoined(true)
      })

      await engine.joinChannel(null, channelId, null, 0)
    } catch (e) {
      Alert.alert('Error', 'Failed to start call')
      navigation.goBack()
    }
  }

  const endCall = async () => {
    clearInterval(timerRef.current)
    if (engineRef.current) {
      await engineRef.current.leaveChannel()
      engineRef.current.destroy()
      engineRef.current = null
    }
    navigation.goBack()
  }

  const toggleMute = async () => {
    await engineRef.current?.muteLocalAudioStream(!muted)
    setMuted(!muted)
  }

  const toggleVideo = async () => {
    await engineRef.current?.muteLocalVideoStream(!videoOff)
    setVideoOff(!videoOff)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }}>
      <StatusBar barStyle="light-content" />

      {/* Video Views */}
      {isVideo && joined && remoteUid && (
        <RtcRemoteView.SurfaceView
          uid={remoteUid}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          renderMode={VideoRenderMode.Hidden}
        />
      )}

      {isVideo && joined && !videoOff && (
        <RtcLocalView.SurfaceView
          style={{ position: 'absolute', top: 20, right: 20, width: 120, height: 160, borderRadius: 12, overflow: 'hidden' }}
          renderMode={VideoRenderMode.Hidden}
        />
      )}

      {/* Call Info */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {(!isVideo || !remoteUid) && (
          <>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: '700' }}>{callerName?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>{callerName}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 14 }}>
              {!joined ? 'Connecting...' : remoteUid ? formatDuration(callDuration) : 'Waiting for other user...'}
            </Text>
          </>
        )}
        {isVideo && joined && remoteUid && (
          <Text style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: 13, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 }}>
            {formatDuration(callDuration)}
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40 }}>
        <TouchableOpacity onPress={toggleMute} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: muted ? '#ef4444' : '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
          <Text style={{ fontSize: 24 }}>{muted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={endCall} style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
          <Text style={{ fontSize: 28 }}>📵</Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity onPress={toggleVideo} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: videoOff ? '#ef4444' : '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
            <Text style={{ fontSize: 24 }}>{videoOff ? '📷' : '🎥'}</Text>
          </TouchableOpacity>
        )}

        {!isVideo && (
          <TouchableOpacity style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
            <Text style={{ fontSize: 24 }}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}